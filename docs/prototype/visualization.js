(function() {
    var currYear = 2000;

    var sizeMin;
    var sizeMax;
    var rangeMin = 2;
    var rangeMax = 50;

    var height = 500*1.5,
        width = 770*1.5;

    var svg = d3.select("#map")
        .append("svg")
        .attr("height", height)
        .attr("width", width)
        .append("g");

    var g = svg.append("g");

    d3.queue()
        .defer(d3.json, "boroughs.json")
        .await(ready);

    var dataArray;
    var globalData;
    var selectedYearDataArray;
    var boroughs;

    var legendVals = [" ","Soup Kitchen","Food Pantry","Shelter","Senior Center","Day Care","Others","  "];

    function loadGlobalData() {
        console.log("commafy");
        d3.csv("global2.csv", function(rows) {
            globalData = rows;
            updatePanelWorld();
            dataArrayLoaded();
        });
    }

    function loadServedData() {
        d3.csv("food_data3.csv", function(rows) {
            dataArray = rows;
            // this method will not be called until the above data is fully loaded
            loadGlobalData();
        });
    }

    function dataArrayLoaded() {
        var numServed = [];
        for (var i = 0; i < dataArray.length; i++) {
            numServed.push(dataArray[i].csn_total);
        }

        sizeMin = Math.min.apply(Math, numServed);
        sizeMax = Math.max.apply(Math, numServed);

        var radius = d3.scaleSqrt()
            .domain([sizeMin, sizeMax])
            .range([rangeMin, rangeMax]);


        // Make slider
        makeSlider(dataArray, radius);

        // Make legend
        makeLegend(legendVals);
    }

    // for creating an array of years 1970-2015
    function range(start, count) {
        return Array.apply(0, Array(count + 1))
            .map(function (element, index) {
                return index + start;
            });
    }

    var nyc_center = [-74,40.7];
    var mapRatio = 1;
    var mapRatioAdjuster = 100;
    var projection = d3.geoMercator()
        .translate([width/2, height/2+50])
        .center(nyc_center)
        .scale(width*(mapRatio+mapRatioAdjuster/2));

    var path = d3.geoPath().projection(projection);

    function ready (error, data) {
        loadServedData();
        boroughs = topojson.feature(data, data.objects.boroughs).features;
        drawBoroughs(data);
    }

    function drawBoroughs (data) {
        g.selectAll(".borough")
            .data(boroughs)
            .enter().append("path")
            .attr("class", "borough")
            .attr("d", path)
            .on('mouseover', function(d) {
                d3.select(this).classed("selected", true)
                dataArray.forEach(function(entry) {
                    if (entry.alpha_3_code == d.id && entry.iyear == currYear) {
                        updatePanel(entry);
                    }
                });

            })
            .on('mouseout', function(d) {
                d3.select(this).classed("selected", false)
                updatePanelWorld();
            })
    }

    function drawBubbles(serveData, radius) {
        // make bubbles on map
        var bubbles = g.selectAll(".bubbles")
            .data(serveData)
            .enter().append("circle")
            .attr("r", function (d) {
                return radius(d.csn_total);
            })
            .attr("cx", function (d) {
                var coords = projection([d.longitude, d.latitude])
                return coords[0];
            })
            .attr("cy", function (d) {
                var coords = projection([d.longitude, d.latitude])
                return coords[1];
            })
            .style("fill", function (d) {
            	if (d.FacilityType == "Soup Kitchen"){
            		return "#0082c8" //Blue
            	}
            	else if (d.FacilityType == "Food Pantry"){
            		return "#f58231" // Orange
            	}
            	else if (d.FacilityType == "Shelter"){
            		return "#3cb44b" // Green
            	}
            	else if (d.FacilityType == "Senior Center"){
            		return "#ffe119" // Yellow
            	}
            	else if (d.FacilityType == "Day Care"){
            		return "#e6194b" // Red
            	}
            	else{
            		return "#911eb4" // Purple
            	}
            })
            .style("opacity", 0.7)
            // fade in on mouseover
            .on("mouseover", function(d) {

                updatePanel(d);

                this.parentNode.appendChild(this);

                d3.select(this).transition()
                    .duration(200)
                    .style("opacity", 1)
                    .style("stroke", "#000")
            })
            // fade out tooltip on mouse out
            .on("mouseout", function(d) {
                d3.select(this).transition()
                    .duration(500)
                    .style("opacity", 0.7)
                    .style("stroke", "none");

                updatePanelWorld();

            });

        customZoom(bubbles, radius);
    }

    function updatePanel(d) {
        d3.select("#panelInfo")
            .html("<span id=\"countryTitle\">" + currYear + " | " + d.EFP + "</span>"
            	+ "<br/> Address: " + d.DistributionAddress
            	+ "<br/> Facility Type: " + d.FacilityType
                + "<br/> Total served: " + Intl.NumberFormat().format(d.csn_total)
                + "<br/> Adults served: " + Intl.NumberFormat().format(d.csn_adults)
                + "<br/> Seniors served: " + Intl.NumberFormat().format(d.csn_seniors)
                + "<br/> Children served: " + Intl.NumberFormat().format(d.csn_children));
    }
    function commafy( num ) {
        num.toString().replace( /\B(?=(?:\d{3})+)$/g, "," );
    }
    function updatePanelWorld() {
        var d;
        globalData.forEach(function(entry) {
            if (entry.iyear == currYear) {
                d = entry;
            }
        });

        d3.select("#panelInfo")
            .html("<span id=\"countryTitle\">" + currYear + " | All Boroughs</span>"
                + "<br/> Number of Facilities: " + d.num_facilities
                + "<br/> People Served: " + Intl.NumberFormat().format(d.num_served)
                + "<br/> Total People Served: " + Intl.NumberFormat().format(d.total_served));
    }

    function customZoom(bubbles, radius) {
        var zoom = d3.zoom()
            .scaleExtent([1, 10])
            .on('zoom', function() {
                g.attr('transform','translate(' + d3.event.transform.x + ',' + d3.event.transform.y + ') scale(' + d3.event.transform.k + ')');
                radius.range([2/d3.event.transform.k, 50/d3.event.transform.k]);
                bubbles
                    .attr('r', function(d) {
                        return radius(d.csn_total);
                    })
                    .attr("stroke-width", (0.5 / d3.event.transform.k) * 2 + "px");
            });

        d3.select('#map').select('svg').call(zoom);
    }

    function makeSlider(dataArray, radius) {
        var margin = {right: 15, left: 15},
            containerWidth = 840,
            containerHeight = 40;
        sliderWidth = containerWidth - margin.left - margin.right,
            sliderHeight = containerHeight
        startYear = 2000,
            endYear = 2017;

        var svgSlider = d3.select("#slider")
            .append("svg")
            .attr("height", containerHeight*1.5)
            .attr("width", containerWidth*2);

        var x = d3.scaleLinear()
            .domain([startYear, endYear])
            .range([0, sliderWidth])
            .clamp(true);

        var slider = svgSlider.append("g")
            .attr("class", "slider")
            .attr("transform", "translate(" + margin.left + "," + sliderHeight / 2 + ")");

        // Slider body
        slider.append("line")
            .attr("class", "track")
            .attr("x1", x.range()[0])
            .attr("x2", x.range()[1])
            .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
            .attr("class", "track-inset")
            .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
            .attr("class", "track-overlay")
            .call(d3.drag()
                .on("start.interrupt", function() { slider.interrupt(); })
                .on("start drag", function() { handleDrag(x.invert(d3.event.x)); }));

        // Ticks
        slider.insert("g", ".track-overlay")
            .attr("class", "ticks")
            .attr("transform", "translate(0," + 18 + ")")
            .selectAll("text")
            .data(x.ticks(10))
            .enter().append("text")
            .attr("x", x)
            .attr("text-anchor", "middle")
            .text(function(d) { return d; });

        // Handle
        var handle = slider.insert("circle", ".track-overlay")
            .attr("class", "handle")
            .attr("r", 9);

        slider.transition()
            .duration(750);

        // Must be nested function because of d3.drag().on("start drag", ...) code,
        // drag function has to be defined after slider's handle is created,
        // but handle has to be created last to be drawn on top of slider
        function handleDrag(eventX) {
            handle.attr("cx", x(eventX));

            // gather data only for the selected year
            var selectedYear = Math.round(eventX);

            selectedYearDataArray = [];
            currYear = selectedYear;

            dataArray.forEach(function(entry) {
                if (entry.iyear == selectedYear) {
                    selectedYearDataArray.push(entry);
                }
            });

            // clear old circles and draw new
            var circles = svg.selectAll("circle");
            circles.remove();
            drawBubbles(selectedYearDataArray, radius);
            updatePanelWorld();
        }

        // Manually call to instantiate map upon load
        handleDrag(x.invert(0));
    }
    function makeLegend(legendVals) {
        // size
        var sizeHeight = 200,
            sizeWidth = 300;
        console.log(legendVals);
        var svgLegned = d3.select("#legend").append("svg")
            .attr("width", sizeWidth).attr("height", sizeHeight);
        var legend = svgLegned.selectAll('#legend')
            .data(legendVals)
            .enter().append('g')
            // .attr("class", "legends3")
            .attr("transform", function (d, i) {
                {
                    return "translate(0," + i * 20 + ")"
                }
            })

        legend.append('rect')
            .attr("x", 5)
            .attr("y", 0)
            .attr("width", 20)
            .attr("height", 12)
            .style("fill",function(d){
                if (d == " "){
                    return "#fafafa" //background color
                }
                else if (d == "  "){
                    return "#fafafa" //background color
                }
                else if (d == "Soup Kitchen"){
                    return "#0082c8" //Blue
                }
                else if (d == "Food Pantry"){
                    return "#f58231" // Orange
                }
                else if (d == "Shelter"){
                    return "#3cb44b" // Green
                }
                else if (d == "Senior Center"){
                    return "#ffe119" // Yellow
                }
                else if (d == "Day Care"){
                    return "#e6194b" // Red
                }
                else{
                    return "#911eb4" // Purple
                }
            })

        legend.append('text')
            .attr("x", 30)
            .attr("y", 12)
            //.attr("dy", ".35em")
            .text(function (d) {
                return d
            })
           //.style("text-anchor", "start")
            .style("font-size", 20)

    }

}) ();
