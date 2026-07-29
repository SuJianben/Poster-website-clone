var tpWidgetsPixelBlocked = true;

(async function() {
    if (window.tpHeaderLoaded === true) {
        return;
    }

    let hasLoadedWidgets = false;

    window.tpHeaderLoaded = true;
    const SCRIPT_URL = 'https://invitejs.trustpilot.com/tp.min.js';
    const WIDGET_SCRIPT = '//widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js';
    const PREVIEW_SCRIPT_URL = '//ecommplugins-scripts.trustpilot.com/v2.1/js/preview_shopify.js';
    const APP_URL = '//ecommplugins-reviewsapp.trustpilot.com';
    const TRUSTBOX_PREVIEW_URL = '//ecommplugins-trustboxpreview.trustpilot.com/v2.0/trustboxpreview.min.js';
    const PREVIEW_CSS_URL = '//ecommplugins-scripts.trustpilot.com/v2.1/css/preview.min.css';
    const TRUSTPILOT_PRODUCT_ID_PREFIX = 'TRUSTPILOT_SKU_VALUE_';

    function b64EncodeUnicode(str) {
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
            return String.fromCharCode(parseInt(p1, 16))
        }))
    }

    function b64DecodeUnicode(str) {
        return decodeURIComponent(Array.prototype.map.call(atob(str), function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        }).join(''))
    }

    const scriptUrl = new URL(document.currentScript.src);
    const param = scriptUrl.searchParams ? scriptUrl.searchParams.get('settings') : undefined;
    const shop = scriptUrl.searchParams ? scriptUrl.searchParams.get('shop') : 'https://admin.shopify.com';
    const trustpilot_settings = param ? JSON.parse(b64DecodeUnicode(param)) : {};

    if (typeof TrustpilotObject === 'undefined') {
        (function(w,d,s,r,n){w.TrustpilotObject=n;w[n]=w[n]||function(){(w[n].q=w[n].q||[]).push(arguments)};
        a=d.createElement(s);a.async=1;a.src=r;a.type='text/java'+s;f=d.getElementsByTagName(s)[0];
        f.parentNode.insertBefore(a,f)})(window,document,'script', SCRIPT_URL, 'tp');
    }
    tp('register', trustpilot_settings['key']);
    const e = new CustomEvent('trustpilotScriptLoaded');
    dispatchEvent(e);

    function checkPreviewMode(url) {
        if (url && url.searchParams && url.searchParams.get('tpTrustBoxPreview') === 'true') {
            return true;
        }
        return false;
    }

    const url = new URL(window.location.href);
    if (checkPreviewMode(url)) {

        document.body.style.paddingTop = '75px';

        var w = document.createElement("script");
        w.type = "text/javascript";
        w.src = WIDGET_SCRIPT;
        w.async = true;
        document.head.appendChild(w);

        if (typeof TrustpilotPreview === 'undefined') {
            try {
                var p = document.createElement("script");
                p.type = "text/javascript";
                p.src = PREVIEW_SCRIPT_URL;
                p.onload = function (e) {
                    const pixel = document.createElement('iframe');
                    pixel.id = 'pixel_iframe';
                    pixel.src = `${APP_URL}/pixel/index.html?shop=${shop}`;
                    pixel.setAttribute("style", "display: none; width: 1px; height: 1px;");
                    pixel.onload = function (e) {
                        document.getElementById('pixel_iframe').contentWindow.postMessage(JSON.stringify({
                            basis: 'iframe',
                            action: 'initialLoad'
                        }), 'https:' + APP_URL);
                    }
                    document.body.appendChild(pixel);
                };
                document.head.appendChild(p);
            } catch (e) {
                console.log(`TrustpilotPreview couldn't load`);
            }
        }

        async function loadData(jsonData) {
            var g = document.createElement('div');
            g.id = 'trustpilot_initial_data';
            g.setAttribute("data-page-urls", b64EncodeUnicode(JSON.stringify(jsonData.loadData.trustbox.pageUrls)));
            g.setAttribute("data-custom-trustboxes", jsonData.loadData.customTrustBoxes);
            g.setAttribute("data-settings", b64EncodeUnicode(JSON.stringify(jsonData.loadData)));
            g.setAttribute("id", "trustpilot-trustbox-preview");
            g.setAttribute("data-source", "Shopify");
            g.setAttribute("data-sku", getPageType() === 'product' ? await getSkus(trustpilot_settings['s']) : '');
            document.body.appendChild(g);

            var q = document.createElement("script");
            q.type = "text/javascript";
            q.src = TRUSTBOX_PREVIEW_URL;
            q.async = true;
            q.onload = function() {
                const message = JSON.stringify({
                    basis: "iframe",
                    TrustBoxPreviewMode: {"integrationKey":trustpilot_settings.key},
                    enable: true,
                    widgets: jsonData.widgets
                });
                window.postMessage(message, window.origin);

                tpWidgetsPixelBlocked = false;
                TrustpilotPreview.init([PREVIEW_CSS_URL], jsonData.loadData.trustbox,  window, document.getElementById('pixel_iframe').contentWindow);
            };
            document.head.appendChild(q);
        }

        window.addEventListener('message', function(e) {
            var adminOrign = new URL(window.location).hostname;

            var eventOriginHostname = new URL(e.origin).hostname;
            var originMissmatchOldCondition = e.origin.indexOf(adminOrign) === -1;
            var originMissmatchNewCondition = adminOrign !== eventOriginHostname;
            if (originMissmatchOldCondition !== originMissmatchNewCondition) {
                console.log(`Origin missmatch: old condition result: ${originMissmatchOldCondition}, new condition result: ${originMissmatchNewCondition}`);
            }

            if (!e.data || originMissmatchNewCondition && e.origin !== 'https:' + APP_URL) {
                return;
            }
            if (typeof TrustpilotPreview !== 'undefined') {
                if (typeof e.data === 'string' && e.data === 'submit') {
                    TrustpilotPreview.sendTrustboxes();
                } else if (typeof e.data === 'string') {
                    try {
                        jsonData = JSON.parse(e.data);
                    } catch (error) {
                        return;
                    }
                    if (jsonData.trustbox) {
                        TrustpilotPreview.setSettings(jsonData.trustbox);
                    } else if (
                        jsonData.type === 'updatePageUrls' ||
                        jsonData.type === 'newTrustBox' ||
                        jsonData.type === 'deletePageTrustBoxes'
                    ) {
                        TrustpilotPreview.sendDataTransfer(e.data);
                    } else if (jsonData.type === 'loadCategoryProductInfo') {
                        loadCategoryProductInfo().then((data) => {
                            window.postMessage(JSON.stringify(data), window.origin);
                        })
                    } else if (jsonData.customised) {
                        TrustpilotPreview.updateActive(jsonData.customised);
                    } else if (jsonData.loadData) {
                        if (!hasLoadedWidgets) {
                            loadData(jsonData);
                            hasLoadedWidgets = true;
                        }
                    }
                }
            }
        });
    } else {
        if (typeof trustpilot_trustbox_settings !== "undefined") {
            await renderTrustboxes();
        } else {
            addEventListener('trustpilotTrustboxSettingsLoaded', async function() {
                await renderTrustboxes();
            });
        }
    }

    async function addSkusToTrustboxes(skuSelector) {
        var skus = (await getSkus(skuSelector)).join(',');
        var name = getName();
        for (var trustBox in trustpilot_trustbox_settings.trustboxes) {
            trustpilot_trustbox_settings.trustboxes[trustBox].sku = skus;
            trustpilot_trustbox_settings.trustboxes[trustBox].name = name;
        }
    }

    async function getSkus(skuSelector) {
        skuSelector = checkSkuSelector(skuSelector);
        var skus = [];
        if (skuSelector === 'sku' && meta && meta.product && meta.product.variants) {
            extractSkus(skus, skuSelector, meta.product);
        } else {
            try {
                const data = await new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.onreadystatechange = function() {
                        if (xhr.readyState === 4 && xhr.status == 200) {
                            try {
                                resolve(JSON.parse(xhr.response));
                            } catch (e) {
                                reject();
                            }
                        }
                    }
                    xhr.open('GET', window.location.href, true);
                    xhr.setRequestHeader('Accept', 'application/json');
                    xhr.send(null);
                });
                extractSkus(skus, skuSelector, data.product);
            } catch (e) {}
        }
        return skus;
    }

    function extractSkus(skus, skuSelector, product) {
        skus.push(`${TRUSTPILOT_PRODUCT_ID_PREFIX}${product.id}`);
        var variants = product.variants;
        for (var variant in variants) {
            skus.push(`${TRUSTPILOT_PRODUCT_ID_PREFIX}${variants[variant].id}`);
            if (variants[variant][skuSelector]) {
                skus.push(variants[variant][skuSelector]);
            }
        }
    }

    function getName() {
        var meta = ((ShopifyAnalytics && ShopifyAnalytics.meta) || meta);
        if (meta && meta.product && meta.product.variants && meta.product.variants.length > 0) {
            var variants = meta.product.variants;
            if (meta.product.selectedVariantId) {
                for (var i = 0; i < variants.length; i++) {
                    if (variants[i].id == meta.product.selectedVariantId) return variants[i].name;
                }
            }
            return variants[0].name;
        }
    }

    function checkSkuSelector(skuSelector) {
        if (!skuSelector) {
            skuSelector = 'sku'
        }
        return skuSelector.toLowerCase();
    }

    function getPageType() {
        const metaTag = document.head.querySelector("[property~='og:type'][content]");
        const metaPageType = metaTag ? metaTag.content : '';
        const pathname = location.pathname;
        if ((meta && meta.page && meta.page.pageType === "home") || (location.pathname === "/")) {
            return "landing";
        }
        // Category page patterns:
        //   /collections
        //   /collections/
        //   /collections/*
        //   /collections/*/
        const categoryRegEx = /^\/collections(\/[a-z0-9-_]+\/?$)?\/?$/;
        if ((meta && meta.page && meta.page.pageType === "collection") || (metaPageType === "product.group")
            || (categoryRegEx.test(pathname))) {
            return "category";
        }
        // Product page patterns:
        //   /collections/*/products/*
        //   /collections/*/products/*/
        //   /products/*
        //   /products/*/
        const productRegEx = /^\/(collections\/[a-z0-9-_]+\/)?products\/[a-z0-9-_]+\/?$/;
        if ((meta && meta.page && meta.page.pageType === "product") || (meta && meta.product !== undefined)
            || (metaPageType === "product") || (productRegEx.test(pathname))) {
            return "product"
        }
    }

    function loadCategoryProductInfo() {
        const handles = $('a.product').toArray().map(el => el.href.split('/').pop());
        return Promise
            .all(handles.map((handle) => new Promise((resolve, reject) => {
                Shopify.getProduct((handle), resolve)
            })))
            .then((products) => {
                const skuSelector = checkSkuSelector();
                const productData = products.map((product) => {
                    return {
                        productUrl: product.url,
                        id: product.id.toString(),
                        variationIds: product.variants.map((v) => v.id.toString()),
                        variationSkus: product.variants.map((v) => v[skuSelector]),
                        name: product.title
                    }
                });
                return productData;
            });
    }

    async function renderTrustboxes() {
        const page = getPageType();
        if (page === "product") {
            const skuSelector = trustpilot_settings['s'];
            await addSkusToTrustboxes(skuSelector);
        }
        if (page === "category") {
            // Do not load product information for a while
            // TODO uncomment and test it properly
            //trustpilot_trustbox_settings.categoryProductsData = await loadCategoryProductInfo()
        }
        trustpilot_trustbox_settings.trustboxes = trustpilot_trustbox_settings.trustboxes.filter(function(trustBox) {
            return page === trustBox.page
                || trimTrailingSlashes(trustBox.page) === trimTrailingSlashes(location.origin + location.pathname)
                || trustBox.page.toLowerCase() === btoa(location.origin + location.pathname).toLowerCase();
        });
        tp('trustBox', trustpilot_trustbox_settings);
    }

    function trimTrailingSlashes(url) {
        if (typeof url === 'string') {
            return url.replace(/\/+$/, "");
        }
        return url;
    }
})();
