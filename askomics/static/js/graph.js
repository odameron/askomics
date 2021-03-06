var expanded = [];

function keepNodesOnTop() {
    // Ensure the nodes are in front and the links on the back
    $(".nodeStrokeClass").each(function( index ) {
        var gnode = this.parentNode;
        gnode.parentNode.appendChild(gnode);
    });
}

function build_link(l, src, target) {
  console.log("running build_link");
  console.log("link: "+l);
  console.log("source: "+src.id);
  console.log("target: "+target.id);
  v = {
      "source": (l.source_id != src.id ? target : src),
      "source_uri": l.source_uri,
      "target": (l.target_id != src.id ? target : src),
      "target_uri": l.target_uri,
      "relation": l.relation_label,
      "relation_uri": l.relation_uri,
      "specified_by": {"uri": l.spec_uri, "relation": ""},
      "special_clause": l.spec_clause,
      "parent_id" : src.id,
      "child_id" : target.id
  };
  console.log("built link: "+JSON.stringify(v));
  return v;
}

function insertSuggestions(prev_node, slt_node, expansionDict, nodeList, linkList) {
    console.log("running insertSuggestions");
    console.log("selected node is: "+JSON.stringify(slt_node));
    console.log("previous node is: "+JSON.stringify(prev_node));
    console.log("current node list is: "+JSON.stringify(nodeList));
    console.log("current link list is: "+JSON.stringify(linkList));

    // add neighbours of a node to the graph as propositions.
    for (suggestedNode of expansionDict.nodes) {
        console.log("suggested node: "+JSON.stringify(suggestedNode));
        suggestedNode.suggested = true;
        suggestedNode.x = slt_node.x;
        suggestedNode.y = slt_node.y;
        nodeList.push(suggestedNode);

        // Create links between entities
        for (suggestedLink of expansionDict.links){
            console.log("suggested link: "+JSON.stringify(suggestedLink));

            if (((suggestedLink.source_id === slt_node.id) && (suggestedLink.target_id === suggestedNode.id)) // Same direction (src -> target) as selected
                    || ((suggestedLink.source_id === suggestedNode.id) && (suggestedLink.target_id === slt_node.id))) { // Inverted direction (target -> src) but still a valid link
                // We found a possible link between our 2 nodes (in the same direction or not)
                linkList.push(build_link(suggestedLink, slt_node, suggestedNode));
            } else if ((prev_node !== null) && (suggestedLink.source_id === prev_node.id) && (suggestedLink.target_id === suggestedNode.id)) {
                console.log("3: link in same direction with previous"); // FIXME what are we trying to do?
                linkList.push(build_link(suggestedLink, prev_node, suggestedNode));
            } else if ((prev_node !== null) && (suggestedLink.source_id === suggestedNode.id) && (suggestedLink.target_id === prev_node.id)) {
                console.log("4: inverted link with previous"); // FIXME what are we trying to do?
                linkList.push(build_link(suggestedLink, prev_node, suggestedNode));
            }
            // else: suggested link is not ok, forget about it (not displayed, not kept in memory)
        }
    }

   // save counter state
    $("#svgdiv").data({ last_counter: expansionDict.last_counter, last_new_counter : expansionDict.last_new_counter });
}

function detailsOf(elemUri, elemId, attributes, nameDiv, data) {
    // Add attributes of the selected node on the right side of AskOmics

    nameDiv = (nameDiv ? nameDiv : elemId);

    var details = $("<div></div>").attr("id",nameDiv).addClass('div-details');

    var addSpecified = function(link) {
        addConstraint('node', link.id, link.specified_by.uri);
        addConstraint('link', link.parent_id, link.specified_by.relation, link.id);
        addConstraint('link', link.child_id, link.specified_by.relation, link.id);
    };

    if (!data) {
        var nameLab = $("<label></label>").attr("for",elemId).text("Name");
        var nameInp = $("<input/>").attr("id", "lab_" + elemId).addClass("form-control");

        details.append(nameLab).append(nameInp);

        nameInp.change(function(d) {
            var value = $(this).val();
            removeFilterCat(elemId);
            removeFilterNum(elemId);
            removeFilterStr(elemId);
            if (value === "") {
                return;
            }
            addFilterStr(elemId,value);
        });
    }

    $.each(attributes, function(i) {
        var id = attributes[i].id;
        var lab = $("<label></label>").attr("for",attributes[i].label).text(attributes[i].label.replace("has_",""));
        var inp = $("<select/>").attr("id",id).addClass("form-control").attr("multiple","multiple");
        //var inp = $("<div/>").attr("id",id).addClass("form-control");
        if (attributes[i].type_uri.indexOf("http://www.w3.org/2001/XMLSchema#") < 0) {
            $('#waitModal').modal('show');
            inp.attr("list", "opt_" + id);
            //console.log(JSON.stringify(nameDiv));
            var service = new RestServiceJs("category_value");
            var model = {
              'category_uri': attributes[i].type_uri,
              'entity': elemUri,
              'category': attributes[i].uri
            };

          //  console.log(attributes[i].uri);
            service.post(model, function(d) {
              //  var datalist = $("<datalist></datalist>").attr("id", "opt_" + id);
                inp.append($("<option></option>").attr("value", "").attr("selected", "selected"));
                var sizeSelect = 3 ;
                if ( d.value.length<3 ) sizeSelect = d.value.length;
                if ( d.value.length === 0 ) sizeSelect = 1;
              //  console.log(d.value.length);
                inp.attr("size",sizeSelect);

                if ( d.value.length > 1 ) {
                  for (v of d.value) {
                    inp.append($("<option></option>").attr("value", v).append(v));
                  }
                } else if (d.value.length == 1) {
                  inp.append($("<option></option>").attr("value", d.value[0]).append(d.value[0]));
                }
              //  inp.append(datalist);
              $('#waitModal').modal('hide');
            });
        } else {
            // OFI -> new adding filter on numeric
            if (attributes[i].type_uri.indexOf("decimal") >= 0) {
              inp = $("<table></table>");

              v = $("<select></select>").attr("id", "sel_" + id).addClass("form-control");
              v.append($("<option></option>").attr("value", '=').append('='));
              v.append($("<option></option>").attr("value", '<').append('<'));
              v.append($("<option></option>").attr("value", '<=').append('<='));
              v.append($("<option></option>").attr("value", '>').append('>'));
              v.append($("<option></option>").attr("value", '>=').append('>='));
              v.append($("<option></option>").attr("value", '!=').append('!='));

              tr = $("<tr></tr>");
              tr.append($("<td></td>").append(v));
              v = $("<input/>").attr("id",id).attr("type", "text").addClass("form-control");
              tr.append($("<td></td>").append(v));
              inp.append(tr);
            } else {
              inp = $("<input/>").attr("id",id).attr("type", "text").addClass("form-control");
            }
        }

        var icon = $('<span></span>')
                .attr('id', 'display_' + id)
                .attr('aria-hidden','true')
                .addClass('glyphicon')
                .addClass('glyphicon-eye-close')
                .addClass('display');

        details.append(lab).append(icon).append(inp);

        inp.change(function() {
            var value = $(this).find('#'+id).val();

            if ( typeof value === 'undefined' ) {
               value = $(this).find('#opt_'+id).val();
            }

            if ( typeof value === 'undefined' || value === '' ) {
              value = $(this).val();
            }

            removeFilterCat(id);
            removeFilterNum(id);
            removeFilterStr(id);

            if (value === "") {
                if (!isDisplayed(id)) {
                    removeConstraint(id);

                    // If no attributes of a link are selected, remove the from the query
                    if ((data) && (!hasConstraint(null,data.id,['node', 'link']))) {
                        removeConstraint(data.id);
                    }
                }
                return;
            }

            // if specified link
            if (data) addSpecified(data);

            if  (attributes[i].type_uri.indexOf("http://www.w3.org/2001/XMLSchema#") < 0) {
                addConstraint('node',id,
                    attributes[i].type_uri);
            }

            addConstraint('attribute',id,
                attributes[i].uri,
                attributes[i].parent);

            if  (attributes[i].type_uri.indexOf("#decimal") > 0) {
              var operator = $(this).find('#sel_'+ id).val();
              addFilterNum(id,value,operator);
            } else if  (attributes[i].type_uri.indexOf("#string") > 0) {
              addFilterStr(id,value);
            } else { /* Category */
              addFilterCat(id,value);
            }
        });

        icon.click(function() {
            if (icon.hasClass('glyphicon-eye-close')) {
                icon.removeClass('glyphicon-eye-close');
                icon.addClass('glyphicon-eye-open');

                // if specified link
                if (data) addSpecified(data);

                addDisplay(id);
                if  (attributes[i].type_uri.indexOf("http://www.w3.org/2001/XMLSchema#") < 0) {
                    addConstraint('node',id,
                        attributes[i].type_uri);
                }
                addConstraint('attribute',id,
                        attributes[i].uri,
                        attributes[i].parent);
            } else {
                icon.removeClass('glyphicon-eye-open');
                icon.addClass('glyphicon-eye-close');
                removeDisplay(id);

                if (!hasFilter(id)) {
                    removeConstraint(id);

                    // If no attributes of a link are selected, remove the from the query
                    if ((data) && (!hasConstraint(null,data.id,['node', 'link']))) {
                        removeConstraint(data.id);
                    }
                }

            }
        });
        //$('#waitModal').modal('hide');
    });

    $("#nodeName").append(formatLabelEntity(elemId));
    $("#nodeDetails").append(details);
}

function myGraph() {
    // d3.js graph

    // set up the D3 visualisation in the specified element
    var w = $("#svgdiv").width(),
    h = 350;

    var slt_elt = null,
        slt_data = null,
        prev_elt = null,
        prev_data = null;

    var vis = d3.select("#svgdiv")
                .append("svg:svg")
                .attr("width", w)
                .attr("height", h)
                .attr("id", "svg")
                .attr("pointer-events", "all")
                .attr("viewBox", "0 0 " + w + " " + h)
                .attr("perserveAspectRatio", "xMinYMid")
                .append('svg:g');

    var force = d3.layout.force();

    var nodes = force.nodes(),
        links = force.links();

    // Add and remove elements on the graph object
    this.addNode = function (node) {
        nodes.push(node);
        update();
    };

    this.removeNode = function (id) {
        if (!findNode(id)) return;
        removeNodeR(id,0, true);

        var p = findParentId(id);
        if (p === null)
            window.location.reload();

        $("#node_" + id).css("opacity", 0.6).hide();
        $("#txt_" + id).hide();
        $("#" + p + "-" + id).css("stroke-dasharray", "5,3").css("opacity", "0.3").hide();


        $("#nodeName").text("");
        $("#showNode").hide();
        $("#deleteNode").hide();
        update();
    };

    var removeNodeR = function (id, count, first) {
        var n = findNode(id);
        if (n === null) return;

        var i = count;
        while (i < links.length) {
            if (links[i].parent_id == n.id) {
                removeNodeR(links[i].child_id, i + 1, false);
                links.splice(i, 1);
            } else i++;
        }

        if (!first) nodes.splice(findNodeIndex(id), 1);

        var index = expanded.indexOf(id);
        if (index > -1) {
            delFromQuery(id);
            expanded.splice(index, 1);


            var tabAttr = $("#" + id + " :input");
            if (tabAttr) {
                $.each(tabAttr, function(i, input) {

                    delFromQuery($(input).attr("id"));
                });
                $("#" + id).remove();
            }
        }
    };

    var findNode = function (id) {
        for (var i in nodes) {
            if (nodes[i].id === id) return nodes[i];
        }
        return null;
    };

    var findNodeIndex = function (id) {
        for (var i = 0; i < nodes.length; i++) {
            if (nodes[i].id == id) {
                return i;
            }
        }
        return null;
    };

    var findParentId = function (id) {
        for (l of links) {
            if (l.child_id == id) return l.parent_id;
        }
        return null;
    };

    var hideSuggestions = function(id) {
        if ($("#node_" + id).length < 1) return;

        // Hide suggestions associated to the previously selected node
        for (l of links) {
            if (id != l.parent_id)
                continue;
            if ((slt_elt) && (slt_data.id == l.child_id))
                continue;
            if (expanded.indexOf(l.child_id) > -1)
                continue;

            $("#node_" + l.child_id).hide();
            $("#" + id + "-" + l.child_id).hide();
            $("#txt_" + l.child_id).hide();
        }
    };

    var showSuggestions = function(id) {
        if ($("#node_" + id).length < 1) return;
        if (expanded.indexOf(id) < 0) return;

        // Show suggestions associated to the selected node.
        for (l of links) {
            if (id != l.parent_id)
                continue;

            $("#node_" + l.child_id).show();
            $("#" + id + "-" + l.child_id).show();
            $("#txt_" + l.child_id).show();
        }
    };

    // Change current node
    var swapSelection = function(new_elt, new_data) {
        prev_elt = slt_elt;
        prev_data = slt_data;
        slt_elt = new_elt;
        slt_data = new_data;
    };

    var deselection = function(id, elt) {
        $("#nodeName").text("");
        $("#" + id).hide();

        if ($(elt).is("circle")) {
            hideSuggestions(id);
            d3.select(elt).style("fill", "royalblue");
        } else if ($(elt).is("line")) {
            d3.select(elt).style("stroke", "#2E2E2E");
        }

        $("#showNode").hide();
        $("#deleteNode").hide();
    };

    var update = function () {
        var link = vis.selectAll("line")
                    .data(links, function (d) {
                        return d.parent_id + "-" + d.child_id;
                    });

        link.enter().append("line")
            .attr("id", function (d) { return d.parent_id + "-" + d.child_id; })
            .attr("class", "link")
            .style("stroke-dasharray", "5,3")
            .style("opacity", "0.3")
            .on('mousedown', function(d) {
                // Mouse down on a link
                var uri = d.specified_by.uri;
                if (uri === "") return;
                if (d.relation_label) return;
                if (this.style[0] === "stroke-dasharray") return;

                d.relation_label = $(this).attr("id");
                d.id = uri.slice( uri.indexOf("#") + 1, uri.length);
                d.id += $("#svgdiv").data().last_counter;

                var service = new RestServiceJs("link");
                var model = {
                    'uri': uri,
                    'last_new_counter':$("#svgdiv").data().last_new_counter
                  };

                service.post(model, function(attr) {
                    if (slt_data)
                        $("#" + slt_data.id).hide();

                    d.specified_by.relation = attr.relation;
                    detailsOf(uri, d.relation_label, attr.attributes, d.id, d);
                });
            })
            .on('mouseup', function(d) {
                // Mouse up on a link
                if (d.specified_by.uri === "") return;
                if (this.style[0] === "stroke-dasharray") return;
                if (this === slt_elt) {
                    deselection(d.id,this);
                    swapSelection(null, null);
                    return;
                }

                swapSelection(this,d);

                // Deselect previous element
                if (prev_data) {
                    deselection(prev_data.id,prev_elt);
                }

                d3.select(slt_elt).style("stroke", "mediumvioletred");

                if ($("#" + slt_data.id).length) {
                    $("#nodeName").append(formatLabelEntity(slt_data.relation_label));
                    $("#" + slt_data.id).show();
                }
            })
            .on('mouseover', function(d) {
                // Mouse over on a link
                if (d.specified_by.uri === "") return;
                if (this.style[0] == "stroke-dasharray") return;

                d3.select(this).style("stroke-width", 4);
            })
            .on('mouseout', function(d) {
                // Mouse out on a link
                if (d.specified_by.uri === "") return;
                d3.select(this).style("stroke-width", 2);
            });

        link.append("title")
            .text(function (d) { return d.value; });

        link.exit().remove();

        var node = vis.selectAll("g.node")
                    .data(nodes, function (d) { return d.id; });

        var nodeEnter = node.enter().append("g")
                            .attr("class", "node")
                            .call(force.drag);

        //setup_node(nodeEnter,slt_elt,slt_data,prev_elt,prev_data);
        nodeEnter.append("svg:circle")
                .attr("r", 12)
                .attr("id", function (d) { return "node_" + d.id; })
                .attr("class", "nodeStrokeClass")
                .style("fill", "royalblue")
                .style("opacity", function(d) {
                    return (d.suggested === true ? 0.6 : 1);
                })
                .on('mousedown', function(d) {
                    // Mouse down on a link
                    document.body.style.cursor = 'crosshair';

                    if (this == slt_elt) {
                        // Clicking on a selected node, unselect it
                        deselection(d.id,this);
                        swapSelection(null, null);

                        return;
                    }

                    swapSelection(this, d);

                    // Deselection of the previous element
                    if (prev_data) {
                        deselection(prev_data.id,prev_elt);
                        hideSuggestions(prev_data.id);
                    }
                    // Show suggestions associated to the selected node.
                    showSuggestions(slt_data.id);

                    // Change eye if the selected node will be displayed
                    if (isDisplayed(slt_data.id)) {
                        $("#showNode").removeClass('glyphicon-eye-close');
                        $("#showNode").addClass('glyphicon-eye-open');
                    } else {
                        $("#showNode").removeClass('glyphicon-eye-open');
                        $("#showNode").addClass('glyphicon-eye-close');
                    }

                    // Colorize the selected node
                    d3.select(slt_elt).style("fill", "mediumvioletred");

                    // Show the filters of the current node.
                    if ($("#" + slt_data.id).length) {
                        $("#nodeName").append(formatLabelEntity(slt_data.id));
                        $("#" + slt_data.id).show();
                    }

                    $("#showNode").show();
                    $("#deleteNode").show();
                })
                .on('mouseup', function(d) {
                    // Mouse up on a link
                    document.body.style.cursor = 'default';

                    if (slt_data != d) return;
                    if ($("#" + slt_data.id).length) return;
                    if (expanded.indexOf(d.id) > -1) return;

                    expanded.push(slt_data.id);
                    addDisplay(slt_data.id);
                    addConstraint('node', slt_data.id, slt_data.uri);

                    // When selected a node is not considered suggested anymore.
                    slt_data.suggested = false;
                    d3.select(slt_elt).style("opacity", "1");

                    // If clicked on a node that is not a starting point
                    // It happens if we clicked on a suggestion
                    // If we click again on a node with an ancestor but that is not a suggestion the constraint will not
                    // be added twice (filtered in addConstraint function)
                    if (prev_data) {
                        // Display a 'real' link in the canvas
                        $("#" + prev_data.id + "-" + slt_data.id).css("stroke-dasharray","");
                        $("#" + prev_data.id + "-" + slt_data.id).css("opacity","1");

                        // Create a constraint corresponding to this link
                        // Links were added when adding suggestion
                        // We need to search in the link list to get the relation_uri
                        for (l of links) {
                            if ((l.child_id == slt_data.id) && (l.parent_id == prev_data.id)) {
                                addConstraint('link',
                                    l.source.id,
                                    l.relation_uri,
                                    l.target.id);
                            }
                        }
                    }

                    // Get the neighbours of a node using REST service
                    var service = new RestServiceJs("neighbours");
                    var model = {
                                  'source_previous_node': prev_data,
                                  'source_node': slt_data,
                                  'last_new_counter': $("#svgdiv").data().last_new_counter
                                };

                    service.post(model, function(expansion) {

                        insertSuggestions(prev_data, slt_data, expansion, nodes, links);

                        for (l of links) {
                            if ((l.special_clause)
                                    && (!hasConstraint(l.special_clause, l.relation, ['node', 'link', 'attribute']))
                                    && (hasConstraint(l.parent_id, l.child_id, ['node', 'clause', 'attribute']))) {
                                addConstraint('clause', l.relation, l.special_clause.replace(/#src#/g, '?' + l.parent_id).replace(/#tg#/g, '?' + l.child_id));
                            }
                            if ((l.special_clause)
                                    && (!hasConstraint(l.special_clause, l.relation, ['node', 'link', 'attribute']))
                                    && (hasConstraint(l.child_id, l.parent_id, ['node', 'clause', 'attribute']))) {
                                addConstraint('clause', l.relation, l.special_clause.replace(/#src#/g, '?' + l.child_id).replace(/#tg#/g, '?' + l.parent_id));
                            }
                        }

                        detailsOf(slt_data.uri, slt_data.id, expansion.attributes);

                        $("#showNode").removeClass('glyphicon-eye-close');
                        $("#showNode").addClass('glyphicon-eye-open');

                        update();
                        keepNodesOnTop();

                        if (prev_data)
                            hideSuggestions(prev_data.id); // Hide suggestions on previous node

                        // save the query in the download button
                        launchQuery(0, 30, true);
                    });
                });

        var elt = $("<tspan></tspan>");

        nodeEnter.append("svg:text").append("tspan")
                .attr("class", "textClass")
                .attr("x", 14)
                .attr("y", ".31em")
                .attr("id", function (d) {
                    return "txt_" + d.id;
                })
                .text(function (d) {
                    var re = new RegExp(/(\d+)$/);
                    var labelEntity = d.id.replace(re,"");

                    return labelEntity;
                  }).append("tspan").attr("font-size","7").attr("baseline-shift","sub")
                  .text(function (d) {
                      var re = new RegExp(/(\d+)$/);
                      var indiceEntity = d.id.match(re);

                      if ( indiceEntity.length>0 )
                        return indiceEntity[0];
                      else
                        return "";
                    })
                ;
              //  .append("<tspan></tspan>").attr("dy","-10").text("2");

        node.exit().remove();

        force.on("tick", function () {
            node.attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; });

            link.attr("x1", function (d) { return d.source.x; })
                .attr("y1", function (d) { return d.source.y; })
                .attr("x2", function (d) { return d.target.x; })
                .attr("y2", function (d) { return d.target.y; });
        });

        // Restart the force layout.
        force.charge(-500)
            .linkDistance(75)
            .size([w, h])
            .start();
    };

    update();
}
