///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 - 2016 Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////

define(['dojo/_base/declare',
    'jimu/BaseWidget',
    'jimu/dijit/Message',
    'dijit/_WidgetsInTemplateMixin',
    'dijit/form/FilteringSelect',
    'dijit/registry',
    'dojo/_base/Color', 
	'dojo/_base/lang',
    'dojo/on',
    'dojo/store/Memory',
    'esri/graphic',
    'esri/graphicsUtils',
    'esri/tasks/query',
    'esri/tasks/QueryTask',
    'esri/symbols/SimpleFillSymbol',
    'esri/symbols/SimpleLineSymbol'
], function(declare, BaseWidget, Message, _WidgetsInTemplateMixin, FilteringSelect, registry, ColorDojo, 
            lang, on, Memory, Graphic, graphicsUtils, Query, QueryTask, SimpleFillSymbol,SimpleLineSymbol) {
    return declare([BaseWidget, _WidgetsInTemplateMixin], {
        baseClass: 'jimu-widget-countywidget',

        postCreate: function() {
            this.inherited(arguments);
        },

        startup: function() {
            this.inherited(arguments);
			var countyWidget = this;
            this._GetProjectList();
			on(dojo.byId("btnZoom"), "click", lang.hitch(countyWidget, "_ZoomCounty"));
        },
	
		// Load the county names into the widget.
		_GetProjectList: function () {
			var item = "NAME"; // Service out field.
			// Minnesota - https://services.arcgis.com/BG6nSlhZSAWtExvp/ArcGIS/rest/services/counties_MN/FeatureServer/0
			// North Dakota - https://ndgishub.nd.gov/ArcGIS/rest/services/All_GovtBoundaries/MapServer/20
			var queryTask = new QueryTask(this.config.serviceURL);
			var query = new Query();
			query.where = "1=1"; // Query to get all counties.
			query.returnGeometry = false;
			query.outFields = [item];
			query.orderByFields = [item];
			queryTask.execute(query, function(results) {
				//Loop through and store all MN counties in dropdown box.
				var data = {
					identifier: 'id', //This field needs to have unique values.
					label: 'name', //Name field for display.
					items: []
				};

				// Create a new datastore.
				var storeItem = new Memory({
					data: data
				});

				// Add results to store.
				for (var i = 0; i < results.features.length; i++) {
					storeItem.put({'id': (i + 1),'name': results.features[i].attributes[item]});
				}
				
				// Pass the store to the county list widget.
				if (registry.byId("countyList")) {
					registry.byId("countyList").reset();
					registry.byId("countyList").store = storeItem;
				}
			});
		},
		
		// Function to zoom to county after clicking button
		_ZoomCounty: function () {
			countyWidget = this;
			map = this.map;
			
			//Query the selected county
			var queryTask = new QueryTask(this.config.serviceURL);
			var query = new Query();
			query.where = "NAME = '" + registry.byId("countyList").displayedValue + "'";
			query.returnGeometry = true;
			query.outFields = ["NAME"];
			

			// Execute task - Zoom to and draw polygon
			on(queryTask, "complete", function(evt){
				zoomToResults(evt, map);
			});
			queryTask.execute(query, lang.hitch(countyWidget, "_addGraphic"));
			

			// Zoom to the location of the result
			function zoomToResults(evt,map){
				var featureSet = evt || {};
				var features = featureSet.featureSet.features || [];
				
				if (features.length > 0) {
					var extent = graphicsUtils.graphicsExtent(features);
					if (extent) {
						map.setExtent(extent.expand(1.5), true);
					}
				}
				else {
					new Message({message: 'The county was not found on the map!',titleLabel: "County Widget Error!",autoHeight: true});
				}
			}
		},
		
		_addGraphic: function(results) {
			countyWidget = this;
			
			// Clear any previous counties
			if (map.graphics) {
				map.graphics.clear();
			}

			// Add polygon graphic to map
			var fieldsSelectionSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASHDOT, new ColorDojo(countyWidget.config.outlineColor), 6),new ColorDojo(countyWidget.config.fillColor));
			map.graphics.add(new Graphic(results.features[0].geometry, fieldsSelectionSymbol)); 
		},
		
		onClose: function() {
			// Clear any previous counties
			if (map.graphics) {
				map.graphics.clear();
			}
		}
	});
});