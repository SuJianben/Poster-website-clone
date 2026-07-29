
    (function() {
      var preconnectOrigins = ["https://cdn.shopify.com"];
      var scripts = ["/cdn/shopifycloud/checkout-web/assets/c1/polyfills.C7jITNoQ.js","/cdn/shopifycloud/checkout-web/assets/c1/app.Cvesnewq.js","/cdn/shopifycloud/checkout-web/assets/c1/esnext-vendor.BcXTKZtQ.js","/cdn/shopifycloud/checkout-web/assets/c1/context-browser.DK46DBAL.js","/cdn/shopifycloud/checkout-web/assets/c1/useShopPayExternalAppContext.CKIhO63O.js","/cdn/shopifycloud/checkout-web/assets/c1/addresses-mailing-address.C4G00UNG.js","/cdn/shopifycloud/checkout-web/assets/c1/payment-methods-filterAvailableMethods.YNgc34B9.js","/cdn/shopifycloud/checkout-web/assets/c1/shop-pay-normalizeBuyerDetails.DKx-ijBV.js","/cdn/shopifycloud/checkout-web/assets/c1/graphql-UserPrivacySettingsSetMutation.BxMorhC6.js","/cdn/shopifycloud/checkout-web/assets/c1/utils-getCommonShopPayExternalTelemetryAttributes.DptkqFeG.js","/cdn/shopifycloud/checkout-web/assets/c1/hooks-useUnauthenticatedErrorModal.2vkPPL2E.js","/cdn/shopifycloud/checkout-web/assets/c1/extensions-rpc.DYjCL5qM.js","/cdn/shopifycloud/checkout-web/assets/c1/graphql-PaymentSessionMutation.nsHUlJMc.js","/cdn/shopifycloud/checkout-web/assets/c1/hydrate.CE6tnWuC.js","/cdn/shopifycloud/checkout-web/assets/c1/utilities-browser.5-5Ab_x5.js","/cdn/shopifycloud/checkout-web/assets/c1/locale-de.c5tXCb4m.js","/cdn/shopifycloud/checkout-web/assets/c1/OnePage.wu74expB.js","/cdn/shopifycloud/checkout-web/assets/c1/hooks-useWalletsTimeout.C5h0z4Wl.js","/cdn/shopifycloud/checkout-web/assets/c1/Monorail-monorailMetric-wallets.hCz3pSad.js","/cdn/shopifycloud/checkout-web/assets/c1/remember-me-hooks.DDBci-PQ.js","/cdn/shopifycloud/checkout-web/assets/c1/ShopLogo.D1ddt3UX.js","/cdn/shopifycloud/checkout-web/assets/c1/hooks-useHasOrdersFromMultipleShops.BSOO1sRA.js","/cdn/shopifycloud/checkout-web/assets/c1/hooks-usePostPurchase.CeZwwZVq.js","/cdn/shopifycloud/checkout-web/assets/c1/components-DeliveryTransition.2vf3Fqoo.js","/cdn/shopifycloud/checkout-web/assets/c1/ChangeCompanyLocationLink.p6Yd0GcE.js","/cdn/shopifycloud/checkout-web/assets/c1/hooks-useStableHostMethodsReferences.pVQ4VuZy.js","/cdn/shopifycloud/checkout-web/assets/c1/hooks-useSandboxTelemetry.BSoPrpPc.js","/cdn/shopifycloud/checkout-web/assets/c1/BillingAddressForm.BD-xTMuW.js","/cdn/shopifycloud/checkout-web/assets/c1/PhoneField.CCmWlBDo.js","/cdn/shopifycloud/checkout-web/assets/c1/hooks-useCanChangeCompanyLocation.Ca0Favbp.js","/cdn/shopifycloud/checkout-web/assets/c1/EmptyState.CM9YzCQv.js","/cdn/shopifycloud/checkout-web/assets/c1/Choice.SECQ894q.js","/cdn/shopifycloud/checkout-web/assets/c1/Checkbox.Cp7F30d5.js","/cdn/shopifycloud/checkout-web/assets/c1/Popover.C9sMx7XI.js","/cdn/shopifycloud/checkout-web/assets/c1/hooks-useForceShopPayUrl.JDOsN_ZD.js","/cdn/shopifycloud/checkout-web/assets/c1/ShopPayLogo.CWK03MHG.js","/cdn/shopifycloud/checkout-web/assets/c1/utilities-stopwatch.CckZZN9U.js","/cdn/shopifycloud/checkout-web/assets/c1/AutocompleteField-hooks.Y71OTRyy.js","/cdn/shopifycloud/checkout-web/assets/c1/PendingShipping.BHMojRL9.js","/cdn/shopifycloud/checkout-web/assets/c1/ImpressionEventCapture.BDv46zBc.js","/cdn/shopifycloud/checkout-web/assets/c1/StoreCreditRedemption-StoreCreditRedemptionErrorBanner.oM7leNSv.js","/cdn/shopifycloud/checkout-web/assets/c1/PaymentIcon.ODasQ7tv.js","/cdn/shopifycloud/checkout-web/assets/c1/shop-cash-context.BoxFBpI8.js","/cdn/shopifycloud/checkout-web/assets/c1/hooks-useGeneralPaymentErrorMessage.Bh1-GHWO.js","/cdn/shopifycloud/checkout-web/assets/c1/PaymentLine.CDlcfLNX.js","/cdn/shopifycloud/checkout-web/assets/c1/useShopPayButtonClassName.BVOksWlv.js","/cdn/shopifycloud/checkout-web/assets/c1/hooks-useShopPayProgressIntercepts.D29YVUkQ.js","/cdn/shopifycloud/checkout-web/assets/c1/hooks-useShowShopPayOptin.gBU5ZhGM.js","/cdn/shopifycloud/checkout-web/assets/c1/hooks-useUpdateCheckoutAddress.BP1o8NIO.js","/cdn/shopifycloud/checkout-web/assets/c1/Section.BIEOezzw.js","/cdn/shopifycloud/checkout-web/assets/c1/useShopPaySessionTokenStorage.CuW9TQ0D.js","/cdn/shopifycloud/checkout-web/assets/c1/hooks-useOnePageFormSubmit.Db7Ci8dW.js","/cdn/shopifycloud/checkout-web/assets/c1/PaymentButtons.COko51Dp.js","/cdn/shopifycloud/checkout-web/assets/c1/hooks-useShopPayCheckoutGqlVersion.D9qe9c1T.js","/cdn/shopifycloud/checkout-web/assets/c1/shop-cash-monorail.qG4_7iLp.js","/cdn/shopifycloud/checkout-web/assets/c1/hooks-useAvailableShopPromotionDiscount.l2E8U6BB.js","/cdn/shopifycloud/checkout-web/assets/c1/BillingAddressSelector.Zp-bUr_z.js","/cdn/shopifycloud/checkout-web/assets/c1/PaymentErrorBanner.Cq77c49C.js","/cdn/shopifycloud/checkout-web/assets/c1/Switch.CuFyksvL.js","/cdn/shopifycloud/checkout-web/assets/c1/shipping-rates-progressiveShippingRatesLoading.DLxFtUIc.js","/cdn/shopifycloud/checkout-web/assets/c1/ShipmentBreakdown.CqWplA_q.js","/cdn/shopifycloud/checkout-web/assets/c1/MerchandiseModal.Bb97pkCR.js","/cdn/shopifycloud/checkout-web/assets/c1/extension-targets-shipping-options.CyLU02ji.js","/cdn/shopifycloud/checkout-web/assets/c1/EstimatedDeliveryContent.D8NMByAH.js","/cdn/shopifycloud/checkout-web/assets/c1/ShippingMethodRateLabel.CGiYfCfz.js","/cdn/shopifycloud/checkout-web/assets/c1/ShippingMethodSelector.Ce4WRXtv.js","/cdn/shopifycloud/checkout-web/assets/c1/TextArea.DC78_uH_.js","/cdn/shopifycloud/checkout-web/assets/c1/SubscriptionPriceBreakdown.BCPdf8cl.js","/cdn/shopifycloud/checkout-web/assets/c1/hooks-usePaypalRowEffects.CgkRbDaj.js","/cdn/shopifycloud/checkout-web/assets/c1/Middot.ByKKd_LU.js","/cdn/shopifycloud/checkout-web/assets/c1/StockProblems-StockProblemsLineItemList.KURQEYtr.js","/cdn/shopifycloud/checkout-web/assets/c1/utilities-publishMessage.DqvzwN3L.js"];
      var styles = ["/cdn/shopifycloud/checkout-web/assets/c1/assets/app.DzgRLp2z.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/useShopPayExternalAppContext.PQOzdEj1.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/ButtonWithRegisterWebPixel.DD_s9MVo.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/OnePage.RWWzwUS2.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/DeliveryTransition.BbEi6fhy.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/StoreCreditRedemptionErrorBanner.DlkKDmBG.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/useShopPaySessionTokenStorage.CqVkJv9Z.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/useOnePageFormSubmit.DGSJyFq1.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/useShopPayProgressIntercepts.CIy8uDiZ.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/Choice.HiYlaz_E.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/EmptyState.BEvzDDvy.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/ChangeCompanyLocationLink.uqpm88mq.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/Section.CU18S7Ap.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/PaymentLine.7870thps.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/Switch.Dq_6Ius6.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/PaymentIcon.CLVwzp6i.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/progressiveShippingRatesLoading.LcqrKXE1.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/useShopPayButtonClassName.BrcQzLuH.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/ShopLogo.87JMHPUK.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/BillingAddressForm.BdwN7V1K.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/PhoneField.DN6CUyst.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/Middot.D7Ujmshx.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/MerchandiseModal.D6OuIVjc.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/EstimatedDeliveryContent.CGkrPwWj.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/PaymentButtons.CuS5ve3d.css"];
      var fontPreconnectUrls = [];
      var fontPrefetchUrls = [];
      var imgPrefetchUrls = ["https://cdn.shopify.com/s/files/1/0601/1253/5810/files/Checkout-Header2_x320.png?v=1697174010"];

      function preconnect(url, callback) {
        var link = document.createElement('link');
        link.rel = 'dns-prefetch preconnect';
        link.href = url;
        link.crossOrigin = '';
        link.onload = link.onerror = callback;
        document.head.appendChild(link);
      }

      function preconnectAssets() {
        var resources = preconnectOrigins.concat(fontPreconnectUrls);
        var index = 0;
        (function next() {
          var res = resources[index++];
          if (res) preconnect(res, next);
        })();
      }

      function prefetch(url, as, callback) {
        var link = document.createElement('link');
        if (link.relList.supports('prefetch')) {
          link.rel = 'prefetch';
          link.fetchPriority = 'low';
          link.as = as;
          if (as === 'font') link.type = 'font/woff2';
          link.href = url;
          link.crossOrigin = '';
          link.onload = link.onerror = callback;
          document.head.appendChild(link);
        } else {
          var xhr = new XMLHttpRequest();
          xhr.open('GET', url, true);
          xhr.onloadend = callback;
          xhr.send();
        }
      }

      function prefetchAssets() {
        var resources = [].concat(
          scripts.map(function(url) { return [url, 'script']; }),
          styles.map(function(url) { return [url, 'style']; }),
          fontPrefetchUrls.map(function(url) { return [url, 'font']; }),
          imgPrefetchUrls.map(function(url) { return [url, 'image']; })
        );
        var index = 0;
        function run() {
          var res = resources[index++];
          if (res) prefetch(res[0], res[1], next);
        }
        var next = (self.requestIdleCallback || setTimeout).bind(self, run);
        next();
      }

      function onLoaded() {
        try {
          if (parseFloat(navigator.connection.effectiveType) > 2 && !navigator.connection.saveData) {
            preconnectAssets();
            prefetchAssets();
          }
        } catch (e) {}
      }

      if (document.readyState === 'complete') {
        onLoaded();
      } else {
        addEventListener('load', onLoaded);
      }
    })();
  