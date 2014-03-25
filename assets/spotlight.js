result_set = {};
debug = '';
default_destination_path = "/home/blaiszik"
default_destination_endpoint = "go#ep1";
transfer_statistics = {};

function gs_load_events() {
    //Perform elasticsearch query for every keyup in the #input-search to give spotlight-style feel
    //console.log('loading events');

    //Events for the popover for creating a new destination
    //**Not operational
    $('#btn-transfer-destination').attr('data-html', true);
    $('#btn-transfer-destination').attr('data-placement', "right");
    $('#btn-transfer-destination').attr('data-content', '<div class="popover-medium"><input class="form-control" id="input-destination-name" placeholder="Add Destination Name"><select multiple class="form-control" id="select-destination-endpoint" style="height:175px;"></select><a id="btn-more-endpoint" class="btn btn-xs btn-primary">More</a></div>');
    $('#btn-transfer-destination').popover();

    $('#btn-transfer-destination').click(function() {
        ep_destination_counter = 0;
        //console.log('refining search endpoints');

        console.log(ep_counter);
        update_endpoint_destination_select(ep_destination_counter * ep_destination_limit, ep_destination_limit);

        $("#btn-more-endpoint").click(function() {
            console.log(ep_counter);
            update_endpoint_destination_select(ep_destination_counter * ep_destination_limit, ep_destination_limit);
        })
    });

    //Events for the refine search popover
    //**Not operational
    $('#btn-refine').attr('data-html', true);
    $('#btn-refine').attr('data-content', '<div class="popover-medium"> <input class="form-control" id="input-endpoint-refine" placeholder="Find endpoint"><select multiple class="form-control" id="select-endpoint" style="height:175px;"></select><a id="btn-more-endpoint" class="btn btn-xs btn-primary">More</a></div>');
    $('#btn-refine').popover();

    $('#btn-refine').click(function() {
        ep_counter = 0;
        //console.log('refining search endpoints');

        //console.log(ep_counter);
        update_endpoint_select(ep_counter * ep_limit, ep_limit);

        $("#btn-more-endpoint").click(function() {
            //console.log(ep_counter);
            update_endpoint_select(ep_counter * ep_limit, ep_limit);
        })
    });

    $("#input-search").bindWithDelay("keyup", function(){ gs_perform_search()}, 300, true)

    //Event to start transfer
    $('#btn-start-transfer').click(function() {
        gs_perform_transfer();
    });

    //Bind the right click event of #input-search to clear the value
    $('#input-search').mousedown(function(event) {
        switch (event.which) {
            case 3:
                $('#input-search').val('');
                break;
        }
    });

    //Add a tag to a group of selected result-set-item(s). First, trim the updates of whitespace, and convert the contents to an array
    //Create the tag HTML and add it to the result-set-item div.  Get the unique Elasticsearch identifier by splitting the div ids
    //and finally perform the update of the item (need to add update permission checking)
    $('#btn-add-tag').click(function() {
    
        tag_input = $('#input-add-tag').val();
        tags = gs_parse_tags(tag_input);
        console.log('Add Tags');
        console.log(tags)

        tag_html = "<h4><label class='label label-primary'>" + tags.tags.join("</label> <label class='label label-primary'>") + "</label></h4>";

        $('.result-set-item-selected').each(function(index) {
            this_id = $(this).attr('id').split('-').slice(3).join('-');
            $('#result-set-tag-' + this_id).html(tag_html);
            gs_perform_update(this_id, tags)
        });
        gs_load_tag_list();

    });

    ////
    //JQuery logic to support selection of result-set-item(s). Currently support all, none, inverse selections
    $('#btn-select-all').on("click", function() {
        $('.result-set-item').addClass('result-set-item-selected');
        build_transfer_list()
    });

    $('#btn-select-none').click(function() {
        $('.result-set-item').removeClass('result-set-item-selected');
        build_transfer_list()

    });

    $('#btn-select-inverse').click(function() {
        $('.result-set-item').toggleClass('result-set-item-selected');
        build_transfer_list()

    });
    /////
    //End button click events 
}

function gs_parse_tags(tag_input){
    tag_obj = {};
    tag_obj.tags = [];
    tag_obj.kv = [];
    kv = {}; //key-value tags

    tags = $('#input-add-tag').val().trim().split(',');
    len = tags.length;
    
    for (i = 0; i < len; i++) {
        tags[i] = tags[i].trim();
        tag_obj.tags = tags;
        
        //Check for any key-value pairs which are separated by :
        pairs = tags[i].split(':');
        if(pairs.length > 1){ 
            tmp_key = pairs[0].trim();
            tmp_value = {}
            tmp_value.value = pairs[1].trim();
            tmp_value.unit = '';
            
            //Check if there are units associated with the value
            value_unit = tmp_value.value.split('#'); //Using # for now, can change later
            console.log(value_unit);
            if(value_unit.length > 1 ){
                tmp_value.value = value_unit[0];
                tmp_value.unit = value_unit[1];
            }
            
            //If the value is numeric, parse it into a numeric form
            if(!isNaN(tmp_value.value)){
                tmp_value.value = parseFloat(tmp_value.value);
            }
            
            kv[tmp_key] = tmp_value;
            tag_obj.kv = kv;
        }
    }
    console.log(tag_obj);
    return tag_obj;
}

//Function to load events for items that may be loaded AFTER the original gs_load_events() is called. 
//These are generally items created in the templating process which can be dynamic
function gs_load_live_events() {
    $('.result-set-item').click(function() {
        $(this).toggleClass('result-set-item-selected');
        build_transfer_list();
    });

    $('.label-last-modified').each(function(index) {
        val = $('.label-last-modified')[index].innerText.trim();
        if (val) {
            var d = new Date(val);
        }
        $('.label-last-modified')[index].innerText = d.toString();
    });
}

function gs_reset_panels() {
    $('#result-block').hide();
    $('#detail-block').hide();
}

/////////
// Elasticsearch update -- GET the original content and then PUT the updates to those documents
// This is currently called multiple times, would be nice to switch to a bulk update
/////////
function gs_perform_update(this_id, tag_list) {
    console.log('perform_update');
    console.log(tag_list);
    es_client.update({
          index: 'globus_public_index',
          type: 'file',
          id: this_id,
          body: {
            // put the partial document under the `doc` key
            doc: {
              tags: tag_list.tags,
              kv: tag_list.kv
              
            }
          }
        }, function (error, response) {
    }); 
}

/////////
// Load the most endpoints in the index
////////
function gs_load_endpoint_list() {
    endpoint_list = [];
    requestData = {
        "query": {
            "match_all": {}
        },
        "facets": {
            "tag": {
                "terms": {
                    "field": "endpoint",
                    "size": 20
                }
            }
        }
    };
    es_client.search({
        index: es_client_default_index,
        type: es_client_default_type,
        body: requestData,
    }).then(function(data) {
        //console.log(data);
    })
}

/////////
// Load the most popular tags for all elements in the index
// - the results are then used to build the tag-group-bar quick select items
/////////
function gs_load_tag_list() {
    tagArr = [];
    requestData = {
        "query": {
            "match_all": {}
        },
        "facets": {
            "tag": {
                "terms": {
                    "field": "tags",
                    "size": 6
                }
            }
        }
    };

    es_client.search({
        index: es_client_default_index,
        type: es_client_default_type,
        body: requestData,
    }).then(function(data) {
        $('#tag-group-bar').html('');
        tag_groups = data.facets.tag.terms;
        //console.log(tag_groups);
        for (i = 0; i < tag_groups.length; i++) {
            tagArr.push("<label class='quick-tag font-white' style='color: #fff'>" + tag_groups[i].term + "</label>");
        }
        $('#tag-group-bar').html(tagArr.join(' | '));
        //When a quick-tag is clicked, add the value to the current search
        $('.quick-tag').click(function() {
            val = $('#input-search').val()
            if (val) {
                val = val + ' '
            }
            $('#input-search').val(val + $(this).text());
            gs_perform_search();
        });
    }, function(err) {
        //console.log('Error loading tag list');
    });
}

///////
// This function is called to perform a search based on the contents of the input box #input-search
// -Results are templated with /templates/search.ejs as the template
///////
function gs_perform_search() {
    if ($('#input-search').val().trim() == '') {
        return;
    }
    $('#detail-block').show();
    $('#result-block').show();

    // Here is where the actual search query is built.  Rankings are assigned with tags given the highest 
    // priority, path, name, endpoint, and DATA_TYPE next
    requestData = {
        "query": {
            "query_string": {
                "fields": ["tags^3", "path^2", "name^2", "title^2", "endpoint", "DATA_TYPE", "username^2"],
                "query": $('#input-search').val() ? $('#input-search').val() : '*'
            }
        }
    };
    console.log(requestData);
    
    es_client.search({
        index: es_client_default_index,
        type: es_client_default_type,
        size: 100,
        body: requestData,
    }).then(function(data) {
        result_set = data.hits.hits;

        //Template the results using EJS templating engine
        new EJS({
            url: './templates/search_result.ejs'
        }).update('ejs-search-result', data);
        
        gs_load_live_events();
        result_file_size_html = "<h4><strong class='text-info'>" + data.hits.total + "</strong> results found | > <strong class='text-info'>" + result_size(result_set, 2) + "</strong></h4>";
        $('#result-file-size').html(result_file_size_html);
        
        //When a quick-tag is clicked, add the value to the current search
        //console.log('.label-tag');
        /*
        $('.label-tag').click(function() {
                    val = $('#input-search').val()
                    if (val) {
                        val = val + ' '
                    }
                    
                    $('#input-search').val(val + $(this)[0].innerHTML.trim());
                    gs_perform_search();
                });
        */

        
    });
    build_transfer_list();
}

///////
// This function is called to perform a transfer based on selected files
///////
function gs_perform_transfer() {
    files_to_transfer = {};
    destination_path = '';
    source_path = '';

    files_to_transfer = build_transfer_list();
    for (var ep in files_to_transfer) {
        //console.log(ep + ': ' + files_to_transfer[ep]);
        go_transfer_file(ep, default_destination_endpoint, files_to_transfer[ep], function() {
            console.log('testing transfer');
        });
    }
    
    transfer_html = "<h4> Transferring: <strong class='text-danger'>"+transfer_statistics.num_transfers+"</strong> objects | <strong class='text-danger'>"+fileSizeSI(transfer_statistics.size.toPrecision(2)) +  "</strong> to <strong>" + default_destination_endpoint + default_destination_path+"</strong></h4><a class='btn btn-default pull-right'>Add Notification</a><a class='btn btn-default pull-right'>Transfer Details</a>";
    $('#modal-body-transfer').html(transfer_html);
    //console.log(files_to_transfer);
}

function build_transfer_list() {
    var files_to_transfer = {};
    //console.log(result_set);

    //Scrape the ids of selected search result items
    $('.result-set-item-selected').each(function(index) {
        this_id = $(this).attr('id').split('-')[2];
        //Create transfer arrays
        if (!files_to_transfer[result_set[this_id]._source.endpoint]) {
            files_to_transfer[result_set[this_id]._source.endpoint] = [];
        }

        //Break down transfers into files and directories
        if (result_set[this_id]._source.type == 'file') {
            destination_path = default_destination_path + '/' + result_set[this_id]._source.file_name
            source_path = result_set[this_id]._source.path + '/' + result_set[this_id]._source.file_name;
        } else {
            destination_path = default_destination_path
            source_path = result_set[this_id]._source.path + result_set[this_id]._source.file_name;
        }

        //Create the transfer object
        transfer_object = {
            "destination_path": destination_path,
            "destination_endpoint": default_destination_endpoint,
            "source_path": result_set[this_id]._source.path + '/' + result_set[this_id]._source.file_name,
            "source_endpoint": result_set[this_id]._source.endpoint,
            "type": result_set[this_id]._source.type,
            "size": result_set[this_id]._source.size
        };
        //Make sure the transfer isn't from-to the same path. If not, add to the files_to_transfer array
        if (!(transfer_object.destination_path == transfer_object.source_path)) {
            files_to_transfer[result_set[this_id]._source.endpoint].push(transfer_object);
        }
    });

    update_transfer_statistics(files_to_transfer);
    return files_to_transfer
}

function update_transfer_statistics(files_to_transfer) {
    transfer_statistics.size = 0;
    transfer_statistics.num_transfers = 0;
        
    debug = files_to_transfer
    for (var ep in files_to_transfer) {
        for(i=0; i<files_to_transfer[ep].length; i++){        
            if(files_to_transfer[ep][i].size){
                transfer_statistics.size += files_to_transfer[ep][i].size;

            }
            transfer_statistics.num_transfers++; 

        }

    }
    console.log(transfer_statistics.num_transfers);
    console.log(transfer_statistics.size);
    
    
     select_file_size_html = "<h4><strong class='text-danger'>" + transfer_statistics.num_transfers + "</strong> selected | > <strong class='text-danger'>" + fileSizeSI(transfer_statistics.size.toPrecision(2)) + "</strong></h4>";
        $('#selected-file-size').html(select_file_size_html);
}

function update_endpoint_select(offset, limit) {
    endpoint_list = go_get_endpoint_names({
                        "offset": offset,
                        "limit": limit
                    });
                    
    $.each(endpoint_list, function(val, text) {
        $('#select-endpoint').append($('<option></option>').val(val).html(text))
    });
    ep_counter += 1;
}

function update_endpoint_destination_select(offset, limit) {
    endpoint_list = go_get_endpoint_names({
        "offset": offset,
        "limit": limit
    });
    $.each(endpoint_list, function(val, text) {
        $('#select-destination-endpoint').append($('<option></option>').val(val).html(text))
    });
    ep_destination_counter += 1;
}

function result_size(result_set, precision) {
    var result_size = 0;
    for (i = 0; i < result_set.length; i++) {
        if (result_set[i]._source.size) {
            result_size = result_size + result_set[i]._source.size;
        }
    }
    //console.log(result_size);
    return fileSizeSI(result_size.toPrecision(precision));
}

//Helper functions, mainly for formatting

function fileSizeSI(a, b, c, d, e) {
    return (b = Math, c = b.log, d = 1e3, e = c(a) / c(d) | 0, a / b.pow(d, e)).toFixed(1) + ' ' + (e ? 'kMGTPEZY' [--e] + 'B' : 'B')
    //kB,MB,GB,TB,PB,EB,ZB,YB
}

var search_delay = (function(){
  var timer = 0;
  return function(callback, ms){
    clearTimeout (timer);
    timer = setTimeout(callback, ms);
  };
})();