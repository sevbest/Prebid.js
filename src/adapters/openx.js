"use strict";
var CONSTANTS = require('../constants.json');
var utils = require('../utils.js');
var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adloader = require('../adloader');

/**
 * Adapter for requesting bids from OpenX.
 *
 * @param {Object} options - Configuration options for OpenX
 * @param {string} options.pageURL - Current page URL to send with bid request
 * @param {string} options.refererURL - Referer URL to send with bid request
 *
 * @returns {{callBids: _callBids}}
 * @constructor
 */
var OpenxAdapter = function OpenxAdapter(options) {

	var opts = options || {};
	var scriptUrl;
	var bids;

	function _callBids(params) {
		bids = params.bids || [];
		for (var i = 0; i < bids.length; i++) {
			// Add each ad unit ID
			var bid = bids[i];
			//load page options from bid request
			if (bid.params.pageURL) {
				opts.pageURL = bid.params.pageURL;
			}
			if (bid.params.refererURL) {
				opts.refererURL = bid.params.refererURL;
			}
			if (bid.params.jstag_url) {
				scriptUrl = bid.params.jstag_url;
			}
			if (bid.params.pgid) {
				opts.pgid = bid.params.pgid;
			}
			//_requestBids(bid);
		}
		_requestBids();
	}

	function _requestBids() {

		if (scriptUrl) {
			adloader.loadScript(scriptUrl, function() {
				var i;
				var POX = OX();
				var aSizes = [];

				POX.setPageURL(opts.pageURL);
				POX.setRefererURL(opts.refererURL);
				POX.addPage(opts.pgid);
				
					
				// Add each ad unit ID
				utils._each(bids, function(value, key) {
				for (i = 0; i < bids[key].sizes.length; i++) {
						var size = bids[key].sizes[i].join('x');
						aSizes.push(size);
					}
					POX.addAdUnit(bids[key].params.unit);
					POX.setAdSizes(aSizes);
				});
				POX.addHook(function(response) {
					var i;
					var adUnit;
					var adResponse;

					// Map each bid to its response
					for (i = 0; i < bids.length; i++) {
						var bid = bids[i];


						// Get ad response
						adUnit = response.getOrCreateAdUnit(bid.params.unit);

						// If 'pub_rev' (CPM) isn't returned we got an empty response
						if (adUnit.get('pub_rev')) {
							adResponse = adResponse = bidfactory.createBid(1);

							adResponse.bidderCode = 'openx';
							adResponse.ad_id = adUnit.get('ad_id');
							adResponse.cpm = Number(adUnit.get('pub_rev')) / 1000;
							adResponse.ad = adUnit.get('html');
							adResponse.ts = adUnit.get('ts');
							adResponse.adUrl = adUnit.get('ad_url');
							adResponse.riUrl = bid.params.ri_url;
							adResponse.width = adUnit.get('width');
							adResponse.height = adUnit.get('height');

							bidmanager.addBidResponse(bid.placementCode, adResponse);
						} else {
							// Indicate an ad was not returned
							adResponse = bidfactory.createBid(2);
							adResponse.bidderCode = 'openx';
							bidmanager.addBidResponse(bid.placementCode, adResponse);
						}
					}
				}, OX.Hooks.ON_AD_RESPONSE);

				// Make request
				POX.load();
			});
		}
	}

	return {
		callBids: _callBids
	};
};

module.exports = OpenxAdapter;