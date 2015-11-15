function GoogleMapViewModel() {
  "use strict";
  var self = this;
  var map;
  var infowindow;
  var markers = [];
  var marker;
  self.totalResults = [];
  self.results = ko.observableArray([]);
  self.searchQuery = ko.observable("");
  /********************************************************************
  *   remove ', United States string from the address in search list'
  ********************************************************************/
  self.removeCountryName = function(fullAddress) {
    return fullAddress.replace(', United States','');
  };
  /********************************************************************
  *   alert internet connection stuatus
  ********************************************************************/
  self.updateOnlineStatus = function(event) {
    if (navigator.onLine) {
      console.log(event.type);
      alert(event.type);
    } else {
      console.log(event.type);
      alert(event.type);
    }
  };
  /********************************************************************
  *   initialize google map to San Francisco with serarch query: coffee
  ********************************************************************/
  window.initialize = function() {
    // register listerners to detect whether the browser is online or not
    window.addEventListener('online',  self.updateOnlineStatus);
    window.addEventListener('offline', self.updateOnlineStatus);

    infowindow = new google.maps.InfoWindow({maxWidth: 170});
    // set latitude and logitude to locate San Francisco
    var sanFrancisco = new google.maps.LatLng(37.7816639,-122.4267079);
    map = new google.maps.Map(document.getElementById('map-canvas'), {
      center: sanFrancisco,
      zoom: 14
    });

    var request = {
      location: sanFrancisco,
      radius: 3000,
      query: 'coffee'
    };
    var service = new google.maps.places.PlacesService(map);
    service.textSearch(request, self.callback);
  };
  /***********************************************************************************
  *  callback function will receive initialResults(google data object), and status.
  ************************************************************************************/
  self.callback = function(initialResults, status) {
    if (status == google.maps.places.PlacesServiceStatus.OK) {
      // clone initialResults to use it for filter method later
      self.totalResults = initialResults.slice(0);
      // loop over initialResults and transfer data to results then invoke createMarker function
      for (var i = 0, len = initialResults.length; i < len ; i++) {
        self.results.push(initialResults[i]);
        self.createMarker(self.results()[i]);
        self.getYelpInfo(self.results()[i], i);
      }
    }
  };
  /************************************************************************************
  *  getYelpInfo makes ajax call the Yelp then store response object to totalResults array
  ************************************************************************************/
  self.getYelpInfo = function(googleStoreData, totalResultsIndex){
    function nonce_generate() {
      return (Math.floor(Math.random() * 1e12).toString());
    }
    var yelp_url = "http://api.yelp.com/v2/search";
    // yelp keys
    var YELP_KEY = "8vGgNg_wQ9tKrhrmN-CUzQ";
    var YELP_KEY_SECRET = "djAFHxZ3c93ggZCUKDpTT3j0usU";
    var YELP_TOKEN = "z0WPJFOxNCwCA0o0jmkOO8oinBscMi0Y";
    var YELP_TOKEN_SECRET = "_EvZ3v4jgf58FJlWw67hfWF4o-0";
    // address of interest
    var address = googleStoreData.formatted_address;
    // store name
    var placeName = googleStoreData.name;
    var parameters = {
      oauth_consumer_key: YELP_KEY,
      oauth_token: YELP_TOKEN,
      oauth_nonce: nonce_generate(),
      oauth_timestamp: Math.floor(Date.now()/1000),
      oauth_signature_method: "HMAC-SHA1",
      oauth_version : "1.0",
      callback: "cb",           // This is crucial to include for jsonp implementation in AJAX or else the oauth-signature will be wrong.
      location : address,
      term : placeName,
      limit : "1"               //query only one store
    };

    var encodedSignature = oauthSignature.generate("GET",yelp_url, parameters, YELP_KEY_SECRET, YELP_TOKEN_SECRET);
    parameters.oauth_signature = encodedSignature;

    var settings = {
      url: yelp_url,
      data: parameters,
      cache: true,                // This is crucial to include as well to prevent jQuery from adding on a cache-buster parameter "_=23489489749837", invalidating our oauth-signature
      dataType: "jsonp",
      success: function(yelpResults) {
        // store yelp results into totalResults array
        self.totalResults[totalResultsIndex].yelpResults = yelpResults;
      },
      fail: function(xhr, status, error) {
        console.log("An AJAX error occured: " + status + "\nError: " + error + "\nError detail: " + xhr.responseText);
        self.totalResults[totalResultsIndex].yelpResults = false;
      }
    };
    // Send AJAX query via jQuery library.
    $.ajax(settings);
  };
  /************************************************************************************
  *  create and display marker in the map.
  ************************************************************************************/
  self.createMarker = function(place) {
    var placeLoc = place.geometry.location;
    marker = new google.maps.Marker({
      map: map,
      animation: google.maps.Animation.DROP,
      position: place.geometry.location
    });
    // store marker in markers array.
    markers.push(marker);
    // when user clicks the marker, it will display info on the map.
    google.maps.event.addListener(marker, 'click', function() {
      var currentMarker = this;
      //animate move from inital location to marker position
      map.panTo(currentMarker.getPosition());
      currentMarker.setAnimation(google.maps.Animation.BOUNCE);
      //it takes 750ms to animate marker bounce once
      setTimeout(function(){currentMarker.setAnimation(null); }, 750);
      //display info on the map
      self.displayInfoWindow(currentMarker);
    });
  };
  /************************************************************************************
  *  create and display marker in the map.
  ************************************************************************************/
  self.displayInfoWindow = function(marker) {
    console.log(self.totalResults[0].geometry);
    for (var i = 0, len = self.totalResults.length; i < len; i++) {
      if(marker.getPosition()["lat"] == self.totalResults[i].geometry.location["lat"] && marker.getPosition()["lng"] == self.totalResults[i].geometry.location["lng"]) {
        break;
      }
    }
    // if yelpResults returns false, display error message
    if(!self.totalResults[i].yelpResults) {
      infowindow.setContent("Error: Unable to retrieve data from Yelp.");
    // else set store info.
    } else {
      infowindow.setContent("<div style='font-family: Roboto Condensed, sans-serif; font-size:16px'><b>" + self.totalResults[i].yelpResults.businesses[0].name + "</b></div>" +
                            "<div style='font-family: Roboto, sans-serif; font-size:12px'>" + self.totalResults[i].yelpResults.businesses[0].display_phone + "<br>" +
                            "<img src=" + self.totalResults[i].yelpResults.businesses[0].rating_img_url + ">" +
                            self.totalResults[i].yelpResults.businesses[0].review_count + " reviews<br>" +
                            "<img width='150' src=" + self.totalResults[i].yelpResults.businesses[0].image_url + "></div>"+
                            "<img src='images.png'>");
    }
    // open up info window
    infowindow.open(map, marker);
  };
  /************************************************************************************
  *  selectCoffeeShopFromList will be invoked upon user click on the coffee shop list.
  ************************************************************************************/
  self.selectCoffeeShopFromList = function(coffeeShopData) {
    //animate move from inital location to marker position
    map.panTo(coffeeShopData.geometry.location);
    //anmiate marker bounce
    self.toggleBounce(coffeeShopData);
    //find corresponding marker and pass it to displayInfoWindow as argument
    for (var i=0, len = markers.length; i< len; i++) {
      if (markers[i].getPosition()["lat"] == coffeeShopData.geometry.location["lat"] && markers[i].getPosition()["lng"] == coffeeShopData.geometry.location["lng"]) {
        self.displayInfoWindow(markers[i]);
        break;
      }
    }
  };
  /************************************************************************************
  *  marker bounce animation
  ************************************************************************************/
  self.toggleBounce = function(coffeeShopData) {
    //loop through given markers on the map
    for (var i=0, len = markers.length; i< len; i++) {
      //look for marker that matches latitude and logitude
      if (markers[i].getPosition()["lat"] == coffeeShopData.geometry.location["lat"] && markers[i].getPosition()["lng"] == coffeeShopData.geometry.location["lng"]) {
        //animate marker to bounce
        markers[i].setAnimation(google.maps.Animation.BOUNCE);
        //since we can't add setTimeout function in the loop, we are breaking out of loop and invoking it after.
        break;
      }
    }
    //it takes 750ms to animate marker bounce once
    setTimeout(function(){ markers[i].setAnimation(null); }, 750);
  };
  /************************************************************************************
  *  filter markers and list based on search query
  ************************************************************************************/
  self.filterList = function() {
    // clone totalResults to results to start with full list of coffee shops
    self.results(self.totalResults.slice(0));

    // remove list of coffee shops that does not match with search query
    self.results.remove(function(coffeeShop){
      //if there is no match, match function will return null wihch will then return true
      return (coffeeShop.name).toLowerCase().match(self.searchQuery().toLowerCase())===null;
    });
    //delete all markers
    self.deleteMarkers();
    //drop markers based on filtered result
    for (var i = 0, len = self.results().length; i < len; i++) {
      self.createMarker(self.results()[i]);
    }
  };
  /************************************************************************************
  *  delete all markers
  ************************************************************************************/
  self.deleteMarkers = function() {
    for (var i = 0, len = markers.length; i < len; i++) {
      markers[i].setMap(null);
    }
    markers = [];
  };
  /************************************************************************************
  *  dynammically add google map api call script tag only if browser is online
  ************************************************************************************/
  self.loadScript = function() {
   // warn user when offline
   if (!navigator.onLine) {
        console.log("Your device is currently not online. Please check your internet connection.");
        alert("Your device is currently not online. Please check your internet connection then refresh the page.");
        return;
    }
    //call google map api script
    else {
      var script = document.createElement("script");
      script.type = "text/javascript";
      document.getElementsByTagName("head")[0].appendChild(script);
      script.src = "https://maps.googleapis.com/maps/api/js?libraries=places&key=AIzaSyDiuYSmrpLRXxSnrKs2AeJjwQJRx3uGCtQ&callback=initialize";
    }
  };
  //after page is fully loaded call load script
  window.onload = self.loadScript;
}

ko.applyBindings(new GoogleMapViewModel());