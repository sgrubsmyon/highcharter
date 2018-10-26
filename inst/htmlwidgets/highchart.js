HTMLWidgets.widget({

  name: 'highchart',

  type: 'output',
  
  factory: function(el, width, height) {
    var old_hc_opts = null;
    var new_hc_opts = null;
    
    return {
      renderValue: function(x) {
        // Code that runs on each run:
        // Decide if a full redraw (actually new initialization) is needed (in the beginning, it's always the case)
        
        // Create copy of object that may be modified w/o changing original object
        var new_hc_opts = JSON.parse(JSON.stringify(x.hc_opts));
        // Remove series, chart.marginBottom and chart.spacingBottom from the object
        deleteIrrelevantKeys(new_hc_opts);
        
        if (x.debug) {
          console.log("old and new hc_opts equal?", objectEqual(old_hc_opts, new_hc_opts));
          console.log("old_hc_opts", old_hc_opts);
          console.log("new_hc_opts", new_hc_opts);
        }
        
        if (!objectEqual(old_hc_opts, new_hc_opts)) {
          // Set new hc_opts as the new old
          old_hc_opts = JSON.parse(JSON.stringify(new_hc_opts));
          
          // Code that shall run only in the beginning or if anything besides series data changes:
          // (Every other run will simply update the data without a full redraw)
          
          if (x.debug) {
            window.xclone = JSON.parse(JSON.stringify(x));
            window.elclone = $(el);
            console.log(el);
            console.log("hc_opts", x.hc_opts);
            console.log("theme", x.theme);
            console.log("conf_opts", x.conf_opts);
          }
   
          if (x.fonts !== undefined) {
            x.fonts = ((typeof(x.fonts) == "string") ? [x.fonts] : x.fonts);
            x.fonts.forEach(function(s){
              /* http://stackoverflow.com/questions/4724606 */
              var urlfont = 'https://fonts.googleapis.com/css?family=' + s;
              if (!$("link[href='" + urlfont + "']").length) {
                $('<link href="' + urlfont + '" rel="stylesheet" type="text/css">').appendTo("head");
              }
            });
          }
          
          ResetHighchartsOptions();
          
          if (x.theme !== null) {
            if (x.debug) console.log("adding THEME");
            Highcharts.setOptions(x.theme);
          }
          
          if ((x.theme && x.theme.chart.divBackgroundImage !== undefined) |
               (x.hc_opts.chart  && x.hc_opts.chart.divBackgroundImage !== undefined)) {
            if (x.debug) console.log("adding BackgroundImage");     
            var bkgrnd = x.theme.chart.divBackgroundImage || x.hc_opts.chart.divBackgroundImage;
            Highcharts.wrap(Highcharts.Chart.prototype, "getContainer", function (proceed) {
              proceed.call(this);
              $("#" + el.id).css("background-image", "url(" + bkgrnd + ")");
              $("#" + el.id).css("-webkit-background-size", "cover");
              $("#" + el.id).css("-moz-background-size", "cover");
              $("#" + el.id).css("-o-background-size", "cover");
              $("#" + el.id).css("background-size", "cover");
            });
          }
          
          Highcharts.setOptions(x.conf_opts);
          
          if (x.type == "chart") {
            if (x.debug) console.log("charting CHART");
            $("#" + el.id).highcharts(x.hc_opts);
          } else if (x.type == "stock") {
            if (x.debug) console.log("charting STOCK");
            $("#" + el.id).highcharts('StockChart', x.hc_opts);
          } else if (x.type == "map"){
            if (x.debug) console.log("charting MAP");
            x.hc_opts.series = x.hc_opts.series.map(function(e){
              if (e.geojson === true) {
                if (x.debug) console.log("geojson\n\t", e.type, "\n\t", typeof(e.series));
                e.data = Highcharts.geojson(e.data, e.type);
              }
              return e;
            });
            $("#" + el.id).highcharts('Map', x.hc_opts); 
            if (x.hc_opts.mapNavigation !== undefined && x.hc_opts.mapNavigation.enabled === true){
              /* if have navigation option and enabled true: http://stackoverflow.com/questions/7600454 */
              $("#" + el.id).bind( 'mousewheel DOMMouseScroll', function ( e ) {
                var e0 = e.originalEvent,
                delta = e0.wheelDelta || -e0.detail;
                this.scrollTop += ( delta < 0 ? 1 : -1 ) * 30;
                e.preventDefault();
              });
            }
          }
          
          if (x.hc_opts.motion !== undefined) {
            $("#" + el.id).css({"position" : "relative" });
            if (x.debug) console.log("setting MOTION options");
            var pc = $($("#" + el.id).find("#play-controls")[0]);
            var ct = x.theme.chart;
            
            if (ct.backgroundColor !== undefined) $(pc.find("#play-pause-button")[0]).css({backgroundColor : x.theme.chart.backgroundColor});
        if (ct.style !== undefined) $(pc.find("#play-output")[0]).css(x.theme.chart.style);
        if (ct.style !== undefined && ct.style.color !== undefined) $(pc.find("#play-pause-button")[0]).css({color : x.theme.chart.style.color});
          }
        } else {
          // Code that runs from the second run on:
          
          // Update the series without a full redraw
          var old_s_length = $("#" + el.id).highcharts().series.length;
          var new_s_length = x.hc_opts.series.length;
          var i = 0;
          x.hc_opts.series.forEach(function(s) {
            if (i < old_s_length) {
              $("#" + el.id).highcharts().series[i].update(s);
            } else {
              $("#" + el.id).highcharts().addSeries(s);
            }
            i++;
          });
          // remove any series that might not be desired any more
          for (i = new_s_length; i < old_s_length; i++) {
            $("#" + el.id).highcharts().series[i].remove();
          }
        }
      },
      
      resize: function(width, height) {
        /* http://stackoverflow.com/questions/18445784/ */
        var chart = $("#" +el.id).highcharts();
        var w = chart.renderTo.clientWidth; 
        var h = chart.renderTo.clientHeight; 
        chart.setSize(w, h); 
      }
    };
  }

});

function deleteIrrelevantKeys(obj) {
  delete obj.series;
  if ('chart' in obj) {
    delete obj.chart.marginBottom;
    delete obj.chart.marginLeft;
    delete obj.chart.marginRight;
    delete obj.chart.marginTop;
    delete obj.chart.spacingBottom;
    delete obj.chart.spacingLeft;
    delete obj.chart.spacingRight;
    delete obj.chart.spacingTop;    
  }
}

function keysEqual(keys1, keys2) {
  if (keys1.length != keys2.length) return false;
  for (var i = 0; i < keys1.length; i++) {
    if (keys1[i] != keys2[i]) return false;
  }
  return true;
}
          
function objectEqual(obj1, obj2) {
  if (obj1 === null || obj2 === null) return false;
  if (!keysEqual(Object.keys(obj1), Object.keys(obj2))) return false;
  for (var i = 0; i < Object.keys(obj1).length; i++) {
    var k = Object.keys(obj1)[i];
    if (typeof obj1[k] != typeof obj2[k]) return false;
    if (obj1[k] === null || typeof obj1[k] != "object") {
      if (obj1[k] != obj2[k]) return false;
    } else {
      if (!objectEqual(obj1[k], obj2[k])) return false;
    }    
  }
  return true;
}
