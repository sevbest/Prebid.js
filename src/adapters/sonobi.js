var CONSTANTS = require('../constants.json');
var utils = require('../utils.js');
var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adloader = require('../adloader');

/**
 * Adapter for requesting bids from Sonobi.
 *
 * @returns {{callBids: _callBids}}
 * @constructor
 */
var SonobiAdapter = function SonobiAdapter() {

	var scriptUrl;
	var bids;

	function _callBids(params) {
		bids = params.bids || [];
		var associations = {};
		

		bids.forEach(function(bid) {
			// Add each ad unit ID
			bid['snb_key'] = bid.placementCode+"|"+bid.params.divid;
			var aSizes = [];
			bid.sizes.forEach(function(size){ 
						aSizes.push(size.join('x'));
					});
			//load page options from bid request
			if (bid.params.divid && bid.placementCode) {
				associations[bid.snb_key] = aSizes.join(',');
			}
			//_requestBids(bid);
		});
		 scriptUrl = 'http://apex.go.sonobi.com/trinity.js?key_maker=' + JSON.stringify(associations) + '&s=' + Math.floor(Math.random() * 1000);
		_requestBids();
	}
/*
window.sbi_trinity = {"div-gpt-ad-1392240325438-0":
							{"sbi_apoc": "premium", "sbi_aid": "test_721490228", "sbi_size": "300x250"},
					  "div-gpt-ad-1392240325438-1": 
					  	{"sbi_apoc": "standard","sbi_aid": "test_730171776", "sbi_size": "728x90", "sbi_mouse": 1.5}
					 };
*/  

	function _renderCreative(adid) {
		return '<script type="text/javascript"src="http://' + window.sbi_dc + 'apex.go.sonobi.com/sbi.js?as=dfp&aid='+adid +'"></script>';	
}
	function _requestBids() {

		if (scriptUrl) {
				
			adloader.loadScript(scriptUrl, function(response) {
			var adResponse;
			var content = window.sbi_trinity;

			// Add a response for each bid matching the "nid"
			bids.forEach(function(existingBid) {
				if (!utils.isEmpty(content[existingBid.snb_key]) ) {
							
							var adUnit = content[existingBid.snb_key];
							adResponse = bidfactory.createBid(1);
							adResponse.bidderCode = 'sonobi';
							adResponse.ad_id = adUnit['sbi_aid'];
							adResponse.cpm = Number(adUnit['sbi_mouse']);

							// var snCpmVal = adUnit['sbi_mouse'];
                    		//if (!isNaN(snCpmVal)) { 
                      	  	//snCpm = Math.floor(snCpmVal * 10.0)/10.0;
                       		/// snCpmVal = Math.min(snCpmVal,20.0);
                        		// Replace with this after Sonobi fixes the response
                        	//snCpm = Math.min(snCpmVal,20.0);
                      		//  adResponse.cpm = snCpm;
                    		//}
							//adResponse.ad = adUnit.get('html');
							//adResponse.ts = adUnit.get('ts');
							adResponse.ad = _renderCreative(adResponse.ad_id);
							//adResponse.riUrl = bid.params.ri_url;
						if (adUnit['sbi_size'])
						{
							adResponse.size = adUnit['sbi_size'];
							var dim = adUnit['sbi_size'].split('x');
							adResponse.width = dim[0];
							adResponse.height = dim[1];
						}	
						
					} else {
						// Indicate an ad was not returned
						adResponse = bidfactory.createBid(2);
						adResponse.bidderCode = 'sonobi';
					}

					bidmanager.addBidResponse(existingBid.placementCode, adResponse);
				});
		     });
		}			
	}




	return {
		callBids: _callBids
	};
};
module.exports = SonobiAdapter;