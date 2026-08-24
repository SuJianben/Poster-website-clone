/**
 * Review moderation bridge for the Shopify theme.
 *
 * Copy this file into a Google Apps Script project that is bound to a Google
 * Sheet. The web app only accepts submissions and stores them as PENDING. The
 * publish action is manual and writes approved public fields to the Shopify
 * product JSON metafield custom.approved_reviews.
 *
 * Required Script properties for publishing:
 *   SHOPIFY_STORE_DOMAIN  (example: your-store.myshopify.com)
 *   SHOPIFY_ADMIN_TOKEN   (Admin API token; never put this in the theme)
 *   SHOPIFY_API_VERSION   (optional; defaults to 2025-10)
 */

var SHEET_NAME = 'Reviews';
var HEADERS = [
  'submission_id', 'submitted_at', 'status', 'author', 'email', 'rating',
  'title', 'body', 'product_id', 'product_handle', 'product_title',
  'product_url', 'image_url', 'ordered_product_types', 'shop_domain',
  'source', 'moderated_at', 'published_at', 'error'
];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Review moderation')
    .addItem('Initialize review sheet', 'setupSheet')
    .addItem('Publish APPROVED reviews', 'publishApprovedReviews')
    .addToUi();
}

function setupSheet() {
  var sheet = getSheet_();
  ensureHeaders_(sheet);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, HEADERS.length)
    .setFontWeight('bold')
    .setBackground('#f1f3f4');
  sheet.autoResizeColumns(1, HEADERS.length);
}

function doGet() {
  return json_({ ok: true, service: 'review-moderation', sheet: SHEET_NAME });
}

function doPost(event) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var payload = readPayload_(event);
    var validation = validatePayload_(payload);
    if (!validation.ok) return json_({ ok: false, error: validation.error });

    var sheet = getSheet_();
    ensureHeaders_(sheet);
    var columns = headerMap_(sheet);
    var existing = findByValue_(sheet, columns.submission_id, validation.data.submission_id);
    if (existing) return json_({ ok: true, duplicate: true, status: existing.status });

    var row = [];
    HEADERS.forEach(function(header) {
      row.push(validation.data[header] || '');
    });
    sheet.appendRow(row);
    return json_({ ok: true, status: 'PENDING', submission_id: validation.data.submission_id });
  } catch (error) {
    return json_({ ok: false, error: safeError_(error) });
  } finally {
    lock.releaseLock();
  }
}

function publishApprovedReviews() {
  var config = shopifyConfig_();
  var sheet = getSheet_();
  ensureHeaders_(sheet);
  var columns = headerMap_(sheet);
  var values = sheet.getDataRange().getValues();
  var published = 0;
  var failed = 0;

  for (var rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    var row = values[rowIndex];
    var status = String(row[columns.status - 1] || '').trim().toUpperCase();
    if (status !== 'APPROVED') continue;

    try {
      var productId = String(row[columns.product_id - 1] || '').trim();
      if (!/^\d+$/.test(productId)) throw new Error('Missing or invalid product_id');
      var productGid = 'gid://shopify/Product/' + productId;
      var existingValue = readProductReviews_(config, productGid);
      var reviews = parseReviews_(existingValue);
      var submissionId = String(row[columns.submission_id - 1] || '').trim();
      if (reviews.some(function(review) { return review.id === submissionId; })) {
        updateRow_(sheet, rowIndex + 1, columns, {
          status: 'PUBLISHED', published_at: new Date(), error: ''
        });
        published += 1;
        continue;
      }

      reviews.push(publicReviewFromRow_(row, columns));
      writeProductReviews_(config, productGid, reviews);
      updateRow_(sheet, rowIndex + 1, columns, {
        status: 'PUBLISHED', published_at: new Date(), error: ''
      });
      published += 1;
    } catch (error) {
      updateRow_(sheet, rowIndex + 1, columns, {
        status: 'ERROR', error: safeError_(error)
      });
      failed += 1;
    }
  }

  SpreadsheetApp.getUi().alert('Published: ' + published + '\nErrors: ' + failed);
}

function readPayload_(event) {
  var params = (event && event.parameter) || {};
  if (event && event.postData && event.postData.contents &&
      String(event.postData.type || '').indexOf('application/json') === 0) {
    try {
      params = JSON.parse(event.postData.contents);
    } catch (ignored) {
      params = {};
    }
  }
  return params;
}

function validatePayload_(payload) {
  var value = function(name, fallback) {
    var result = payload[name];
    if (result === undefined || result === null || result === '') return fallback || '';
    return Array.isArray(result) ? result[0] : result;
  };
  // The theme names its hidden field review_submission_id. Accept the
  // generic name too so manual/API submissions remain compatible.
  var submissionId = clean_(value('review_submission_id') || value('submission_id'), 80);
  var author = clean_(value('contact[name]') || value('author'), 120);
  var email = clean_(value('contact[email]') || value('email'), 180);
  var title = clean_(value('contact[Review title]') || value('title'), 180);
  var body = clean_(value('contact[body]') || value('body'), 5000);
  var rating = Number(value('contact[Rating]') || value('rating'));
  var productId = clean_(value('review_product_id') || value('product_id'), 40);
  var startedAt = Number(value('review_started_at') || value('started_at'));
  var imageUrl = clean_(value('contact[Image link]') || value('image_url'), 1000);

  if (!submissionId || !author || !email || !title || !body) {
    return { ok: false, error: 'Required review fields are missing' };
  }
  if (!/^rvw_[a-z0-9_-]{6,80}$/i.test(submissionId) && !/^[0-9a-f-]{20,80}$/i.test(submissionId)) {
    return { ok: false, error: 'Invalid submission_id' };
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: 'Invalid email' };
  if (!(rating >= 1 && rating <= 5 && Math.floor(rating) === rating)) {
    return { ok: false, error: 'Rating must be an integer from 1 to 5' };
  }
  if (!/^\d+$/.test(productId)) return { ok: false, error: 'A product must be selected' };
  if (startedAt && Date.now() - startedAt < 2000) return { ok: false, error: 'Submission was too fast' };
  if (String(value('website')).trim()) return { ok: false, error: 'Spam rejected' };
  if (imageUrl && !/^https:\/\//i.test(imageUrl)) return { ok: false, error: 'Image URL must use HTTPS' };

  var now = new Date();
  var date = Utilities.formatDate(now, Session.getScriptTimeZone() || 'UTC', 'yyyy-MM-dd');
  return {
    ok: true,
    data: {
      submission_id: submissionId,
      submitted_at: now,
      status: 'PENDING',
      author: author,
      email: email,
      rating: rating,
      title: title,
      body: body,
      product_id: productId,
      product_handle: clean_(value('review_product_handle'), 180),
      product_title: clean_(value('review_product_title') || value('contact[Product name]'), 240),
      product_url: clean_(value('review_product_url'), 1000),
      image_url: imageUrl,
      ordered_product_types: clean_(value('contact[Ordered product type 1]'), 500),
      shop_domain: clean_(value('review_shop_domain') || value('shop_domain'), 180),
      source: 'shopify-theme',
      moderated_at: '',
      published_at: '',
      error: '',
      date: date
    }
  };
}

function publicReviewFromRow_(row, columns) {
  var get = function(name) { return row[columns[name] - 1] || ''; };
  var createdAt = get('submitted_at');
  var date = createdAt instanceof Date
    ? Utilities.formatDate(createdAt, Session.getScriptTimeZone() || 'UTC', 'yyyy-MM-dd')
    : String(createdAt).slice(0, 10);
  return {
    id: String(get('submission_id')),
    created_at: createdAt instanceof Date ? createdAt.toISOString() : String(createdAt),
    date: date,
    rating: Number(get('rating')),
    author: String(get('author')),
    title: String(get('title')),
    body: String(get('body')),
    product_title: String(get('product_title')),
    image_url: String(get('image_url')),
    verified: false,
    helpful_count: 0
  };
}

function readProductReviews_(config, productGid) {
  var query = 'query($id: ID!) { product(id: $id) { metafield(namespace: "custom", key: "approved_reviews") { value } } }';
  var data = shopifyGraphql_(config, query, { id: productGid });
  if (!data.product) throw new Error('Product not found: ' + productGid);
  return data.product.metafield ? data.product.metafield.value : '';
}

function writeProductReviews_(config, productGid, reviews) {
  var mutation = 'mutation($metafields: [MetafieldsSetInput!]!) { metafieldsSet(metafields: $metafields) { metafields { id } userErrors { field message code } } }';
  var data = shopifyGraphql_(config, mutation, {
    metafields: [{
      ownerId: productGid,
      namespace: 'custom',
      key: 'approved_reviews',
      type: 'json',
      value: JSON.stringify(reviews.slice(-100))
    }]
  });
  var errors = data.metafieldsSet && data.metafieldsSet.userErrors;
  if (errors && errors.length) throw new Error(errors.map(function(item) { return item.message; }).join('; '));
}

function shopifyGraphql_(config, query, variables) {
  var response = UrlFetchApp.fetch(
    'https://' + config.domain + '/admin/api/' + config.version + '/graphql.json',
    {
      method: 'post',
      contentType: 'application/json',
      headers: { 'X-Shopify-Access-Token': config.token },
      payload: JSON.stringify({ query: query, variables: variables }),
      muteHttpExceptions: true
    }
  );
  var code = response.getResponseCode();
  var body = JSON.parse(response.getContentText() || '{}');
  if (code >= 300 || body.errors) throw new Error('Shopify API error: ' + JSON.stringify(body.errors || body));
  return body.data || {};
}

function shopifyConfig_() {
  var properties = PropertiesService.getScriptProperties();
  var domain = String(properties.getProperty('SHOPIFY_STORE_DOMAIN') || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
  var token = String(properties.getProperty('SHOPIFY_ADMIN_TOKEN') || '');
  var version = String(properties.getProperty('SHOPIFY_API_VERSION') || '2025-10');
  if (!domain || !token) throw new Error('Set SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_TOKEN in Script properties first');
  return { domain: domain, token: token, version: version };
}

function getSheet_() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(SHEET_NAME);
  return sheet || spreadsheet.insertSheet(SHEET_NAME);
}

function ensureHeaders_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    return;
  }
  var current = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), HEADERS.length)).getValues()[0];
  if (String(current[0] || '') !== HEADERS[0]) sheet.insertRowBefore(1);
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
}

function headerMap_(sheet) {
  var headers = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  var result = {};
  headers.forEach(function(header, index) { result[header] = index + 1; });
  return result;
}

function findByValue_(sheet, column, value) {
  if (!column || sheet.getLastRow() < 2) return null;
  var values = sheet.getRange(2, column, sheet.getLastRow() - 1, 1).getValues();
  for (var index = 0; index < values.length; index += 1) {
    if (String(values[index][0]).trim() === String(value).trim()) {
      var row = sheet.getRange(index + 2, 1, 1, HEADERS.length).getValues()[0];
      return { status: row[2] || '' };
    }
  }
  return null;
}

function updateRow_(sheet, rowNumber, columns, updates) {
  Object.keys(updates).forEach(function(key) {
    if (columns[key]) sheet.getRange(rowNumber, columns[key]).setValue(updates[key]);
  });
}

function parseReviews_(value) {
  if (!value) return [];
  try {
    var parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (ignored) {
    throw new Error('custom.approved_reviews is not valid JSON');
  }
}

function clean_(value, maxLength) {
  return String(value || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, maxLength);
}

function safeError_(error) {
  return String(error && error.message ? error.message : error).slice(0, 500);
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
