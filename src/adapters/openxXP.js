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
  var OXbidSizeMap = [];
  var OXbidRespMap = [];

  function _callBids(params) {
    bids = params.bids || [];
    OXbidSizeMap = [];
    OXbidRespMap = [];

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
function OXBidForResponse(response) {
          var i;
          var adUnit;
          var adResponse;
          

          var size = response.width + "x" +response.height; 
          // Map each bid to its response
          
          var units = OXbidSizeMap[size];
          if(utils.isEmpty(units))
          {
            utils.logMessage('[openx]\t bid without unit for size: '+size);
            return;
          }
          var cpm = Number(response.pub_rev) / 1000;
          utils.logMessage('[openx]\tprocessing bid for ' + cpm + ' cpm, and size ' + size);
         
          utils._each(units, function(unit) {
              
              //var unitIdx = _rand(units.length);
              //var unit = units[unitIdx];
              //apply the winning only if the creative is exclusive.
              //if (unit.params.shareCreative == 0)
              //   unit = units.splice(unitIdx, 1)[0];
                  // remove the unit so we don't compete
                  // against ourselves
              utils.logMessage('[openx]\tselecting ' + unit.placementCode + ' from: ' + units.length + ' available units, for size ' + size);
            
              
                 // bid = _makeSuccessBid(unit, size);

              // log which unit we chose
              adResponse = bidfactory.createBid(1);
              adResponse.bidderCode = 'openx';
              adResponse.ad_id = response.ad_id;
              adResponse.cpm = Number(response.pub_rev) / 1000;
              adResponse.ad = response.html;
              adResponse.ts = response.ts;
              adResponse.adUrl = response.ad_url;
              adResponse.riUrl = unit.params.ri_url;
              adResponse.width = response.width;
              adResponse.height = response.height;
              bidmanager.addBidResponse(unit.placementCode, adResponse);

              // mark that we made a bid for this unit,
              // so we can make error/unavail bids for the
              // rest of the units
              OXbidRespMap[unit.placementCode] = true;
          });
        }

function processOXresponse(response)
        {
              var bidresponses = response.adunit.chain;
              var responsesBySize = {};
              utils._each(bidresponses, function (value, key) {
                var res = bidresponses[key];
                res.tier = parseInt(res.pub_rev);

                if (!res) return;
                var size = res.width + "x" + res.height;
                responsesBySize[res.size] = responsesBySize[res.size] || [];
                responsesBySize[res.size].push(res);
              });

              // iterating over the responses, get the top response for
              // each bid size. Now we can make the response for that
              // size.
              utils._each(responsesBySize, function (responses, size) {
                if (utils.isEmpty(responses) || responses.tier == 0) return;
                // get the best bid for the response
                var top = responses.sort(_cpmSort)[0];
                OXBidForResponse(top);
              });

              // we need to create error bids for the rest
              // of the units that didn't win an actual bid;
              // otherwise we won't finish on time and timeout
              // will run all the way
              utils._each(bids, function (bidReq) {
                if (OXbidRespMap[bidReq.placementCode]) return;
                var bid = bidfactory.createBid(2);
                bid.bidderCode = 'openx';
                bidmanager.addBidResponse(bidReq.placementCode, bid);
              });
      }

function _cpmSort(a, b) {
    var aTier = (a || {}).tier,
        bTier = (b || {}).tier;
    return (aTier || 0) - (bTier || 0);
  }

function _rand(rangeMax) {
    return Math.floor(Math.random() * rangeMax);
  }

  function _requestBids() {

    if (scriptUrl) {
      adloader.loadScript(scriptUrl, function() {
        var i;
        var POX = OX();
        var aSizes = [];
        var adunits = []

        POX.setPageURL(opts.pageURL);
        POX.setRefererURL(opts.refererURL);
        POX.addPage(opts.pgid);
        //POX.addAdUnit(bid.params.unit);
          
        // Add each ad unit ID once.
        utils._each(bids, function(value, key) {
       // if (adunits.indexOf(bids[key].params.unit) == -1)
       // {
          POX.addAdUnit(bids[key].params.unit);
       //   adunits.push(bids[key].params.unit);
       // }
        
        for (i = 0; i < bids[key].sizes.length; i++) {
            var size = bids[key].sizes[i].join('x');
          
            if (aSizes.indexOf(size) == -1)
              aSizes.unshift(size);

            OXbidSizeMap[size] = OXbidSizeMap[size] || [];
            OXbidSizeMap[size].push(bids[key]);
          }
          POX.setAdSizes(aSizes);
          //we Zombie the adunit object and override is response processing logic.     
          var unit = POX.getOrCreateAdUnit(bids[key].params.unit);
          unit.load = processOXresponse;
        });

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