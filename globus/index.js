var ERROR_FADE = -1;
var SUCCESS_FADE = 8;
var INFO_FADE = 8;
	
var globus_selection_url = "http://test.globuscs.info/xfer/SelectDestination";
var globus_status_url = "https://test.globuscs.info/xfer/EventList";
var globus_activate_url = "https://test.globuscs.info/activate";
var current_view = [];
var can_create = ["u:kyle"];

 	var dataset_table = null;
	var logged_in_user = null;
	var current_bucket = [];
	var show_all_tags = false; 	// show all the tags on the list view
    var max_tags_limit =10;		// max number of tags to show on the list view

	var selected_catalog = -1;
	
	
	var catalog_map = {};
	
	var PAGE_LIMIT = 10;
	var current_page = 1;
	
	function get_selected_catalog(){
		return $("#catalog_selection").val();
	}
	
	function remove_facet_from_query(search_string){
		$("#search_box").tokenInput("remove", {name: search_string});
		//update_search_query();
	}
	
	function add_facet_to_query(search_string){
		$("#search_box").tokenInput("add", {id: 999, name: search_string});
		//update_search_query();
	}
	
	// TODO need to overhaul this, it should keep the query string and just append to it
	function update_search_query(){
		current_page = 1;
		redraw_table();
	}
	function clear_search(){
		$("#search_box").tokenInput("clear");
		$(".all_facets").children().remove();
	}
	// extract the tags that have been searched for (used to filter the tags shown on each dataset)
	function get_searched_tags(){
		var tags = [];
		
		$.each($("#search_box").tokenInput("get"), function(index, val){
			var split = val["name"].split(/[=<>:]/);
			if (split[0] != null && split[0] != ""){
				tags.push(split[0]);
			}		
		});
		return tags;
	}

	function get_current_search(){
		var current = [];
		$.each($("#search_box").tokenInput("get"), function(index, val){
			current.push(escape_query(val["name"]));
		});
		return current;
	}
	function get_current_escaped_search(){
		var search  = "";
		$.each($("#search_box").tokenInput("get"), function(index, val){
			search = search + escape_query(val["name"]) + ";";
		});
		if (search.length > 0){
			search = search.substring(0, search.length -1);
		}
		
		return search;
	}
	function escape_query(input){
		input = input.replace("<", ":lt:");
		input =input.replace(">", ":gt:");
		return input;
	}
	
  
	
    function clear_list_datasets(){
    	$("#dataset_list_container").children().remove();
    }
    
    function get_ds_actions(dataset){
		var ds_actions = $('<div>', {class: 'dataset_actions dataset_item' });
    	var ds_checkbox = $('<input>', {type: 'checkbox', class: "dataset_list_checkbox" });
    	var ds_favourite = $('<div>', {class: 'dataset_favourite dataset_not_favourite_icon' });
    	var ds_link = $('<div>', {class: 'dataset_link_icon' });

    	if ($.inArray(logged_in_user, dataset['favorite']) >= 0){
    		ds_favourite.removeClass('dataset_not_favourite_icon');
    		ds_favourite.addClass('dataset_favourite_icon');
    	} 
    	
    	ds_favourite.click(function(){
			if (LIST_VIEW){
				var id = $(this).parent().parent().children('.dataset_id').text(); 
			} else {
				var row_data = dataset_table.fnGetData(this.parentNode.parentNode);
		        var id = row_data[1];
			}
			if ($(this).hasClass('dataset_favourite_icon')){
				ds_delete_annotation(get_selected_catalog(), id, "favorite", logged_in_user, null, null);
			} else {
				ds_set_annotation(get_selected_catalog(), id, "favorite", logged_in_user, null, null);
			}
			$(this).toggleClass('dataset_favourite_icon');
			$(this).toggleClass('dataset_not_favourite_icon')
		});
    	
    	ds_link.click(function(){
    		show_sharing_popup(dataset['id'], null)
    	});
    	
    	
    	ds_actions.append(ds_checkbox).append(ds_favourite).append(ds_link);
    	return ds_actions;
    }
    

    function show_sharing_popup(id, dataset){
		// not ideal but get the current URL to use for the redirect
		if (dataset == null){
			dataset = ds_get_full_dataset_info(get_selected_catalog(), id, null)[0];
		}
    	var current_url = window.location.toString().replace(/\?.*/, "")
		current_url = current_url.replace("#", "");
		var url = current_url + "catalog/id=" + encodeURIComponent(get_selected_catalog()) + "/datasets/id=" + dataset['id'];
		var dataset_link = $('#modal_show_link').find(".dataset_link");
		var sharing_options = $('#modal_show_link').find(".sharing_options");
		dataset_link.children().remove();
		dataset_link.val(url);
		$('#modal_show_link').reveal({
			animation: 'fade',                   //fade, fadeAndPop, none
		});
		$('#modal_show_link').focus();
		dataset_link.select();

		sharing_options.children().remove();
		sharing_options.append(generate_sharing_tab(dataset['id'], dataset));
    }
    
    function create_tag_link(tag_name, tag_value, include_tag_name){
    	var tag_link = $('<span>', {class: 'dataset_tag' })
   
    	if (include_tag_name){
    		tag_link.text(tag_name + "=" + tag_value);
    	} else {
    		tag_link.text(tag_value);
    	}
    	tag_link.click(function(){
    		add_facet_to_query(tag_name + "=" + tag_value);
		});
    	return tag_link;
    }
    
    // This only adds tags of a specfic type
    function get_ds_tags_tagname(tag_name, dataset, max_tags){
    	var ds_tags = $('<div>', {text: tag_name +": ", class: 'dataset_owner' });
    	if (dataset[tag_name] != null){
    		if (dataset[tag_name] instanceof Array ) {
				$.each(dataset[tag_name], function(index, value){
					ds_tags.append( create_tag_link(tag_name, value, false));
					ds_tags.append($('<span>', {text: ", "}));
				});
    		}else{
    			ds_tags.append( create_tag_link(tag_name, dataset[tag_name], false));
				ds_tags.append($('<span>', {text: ", "}));
    		}
    		ds_tags.children().last().remove();
    	}
    	return ds_tags;
    }

    // This shows all the tags associated with a dataset
    function get_ds_tags_all(dataset, max_tags){
		var ds_tags = $('<div>', {class: 'dataset_tags' });
		
		var tag_count = 0;
		$.each(dataset['tags present'], function(tag_index, tag_name){
			if ($.inArray(tag_name, ignore_facets) < 0 && tag_count < max_tags){
				//tag_name, dataset[tag_name];		
				if (dataset[tag_name] instanceof Array ) {
					var right = ($("<div>", {class: 'right_side'}));
					$.each(dataset[tag_name], function(index, value){
						ds_tags.append( create_tag_link(tag_name, value, true));
						ds_tags.append($('<span>', {text: ", "}));
					});
				} else if ($.inArray(tag_name, tags_dont_show) < 0){
					ds_tags.append( create_tag_link(tag_name, dataset[tag_name], true));
					ds_tags.append($('<span>', {text: ", "}));

				}
				tag_count ++;
			}
		});
		
		// remove the last child
		ds_tags.children().last().remove();
		
		if (tag_count == max_tags){
			var more_link = $('<span>', {text: ", show more tags ...", class:"link"});
			more_link.click(function(){
				var dataset_info = $(this).closest('.dataset_info');
				$(this).parent('.dataset_tags').remove();
				dataset_info.append(get_ds_tags(dataset, dataset['tags present'].length));
			});
			ds_tags.append(more_link);
		}
		if (tag_count > max_tags_limit){
			var more_link = $('<span>', {text: ", show less tags ...", class:"link"});
			more_link.click(function(){
				var dataset_info = $(this).closest('.dataset_info');
				$(this).parent('.dataset_tags').remove();
				dataset_info.append(get_ds_tags(dataset, max_tags_limit));
			});
			ds_tags.append(more_link);
		}
		
		return ds_tags;
    }
    
    function display_list_datasets(dataset, append_top){
    	var ds = $('<div>', {class: 'dataset'});
    	var ds_id = $('<div>', {text: dataset['id'], class: 'dataset_id', style: "display:none;"});

		var ds_date = $('<div>', {text : format_date(dataset['modified']), class: 'dataset_date dataset_item'});
		var ds_actions = get_ds_actions(dataset);
		
		var ds_info = $('<div>', {class: 'dataset_info dataset_item' });
		var ds_title = $('<div>', {text: dataset['name'], class: 'dataset_title' });
		var ds_title_open_close = $('<div>', {class: 'dataset_title_open dataset_title_open_close' });
		ds_title.append(ds_title_open_close);
		
		var ds_owner = $('<div>', {text: "Owner: ", class: 'dataset_owner' });
		//var ds_owner_span = $('<span>', {text: format_owner(dataset['owner']), class: 'dataset_owner_text' });
		
		ds_title.click(function(){
			var id = $(this).parent().parent().children('.dataset_id').text(); 
			var ds_contents = $(this).parent().parent().children('.dataset_contents');
			open_close_dataset_contents(id, ds_contents);
		});
		ds_owner.append(create_tag_link("owner", dataset["owner"], false));
				
		ds_info.append(ds_title);
		ds_info.append(ds_owner);
		
		if (show_all_tags){
			ds_info.append(get_ds_tags_all(dataset, max_tags_limit));		
		}else{
			ds_info.append(get_ds_tags_tagname("label", dataset, max_tags_limit));
			// add any tags that were explictly searched for
			var search_tags = get_searched_tags();
			$.merge(search_tags, current_view)
			if (search_tags != null && search_tags.length >0){
				$.each(search_tags, function(index, val){
					if (val != "" && val != "owner" && val != "label"){
						ds_info.append(get_ds_tags_tagname(val,dataset, max_tags_limit));	
					}
				});
			}
		}
		
	 	ds.append(ds_id).append(ds_date).append(ds_actions).append(ds_info);

		var ds_contents = $('<div>', {class: 'dataset_contents', style: "display:none" });

		ds.append(ds_contents);
		if (append_top){
	 		$("#dataset_list_container").prepend(ds);
		} else {
			$("#dataset_list_container").append(ds);
		}
    }
    
    function clear_datasets(){
    	clear_list_datasets();
		dataset_table.fnClearTable();
    }
    
    function show_no_catalogs(){
    	display_facets()
    	var ds = $('<div>', {class: 'no_dataset no_catalog'});
    	var first_line = $('<div>', 
    			{text: 'You do not have access to any Catalogs.'});
    	var second_line = $('<div>', {text: "Create a new Catalog", class: 'link'});
    	second_line.click(function(){
    		show_create_catalog();
    	});
    	ds.append(first_line).append(second_line);
	 	$("#dataset_list_container").append(ds);

    }
    
    function show_no_datasets(){
    	display_facets()
    	current_page = 1; 
    	update_paging(0);
    	var ds = $('<div>', {class: 'no_dataset'});
    	var first_line = $('<div>', 
    			{text: 'No datasets matching your search can be found in catalog "' 
    				+ catalog_map[$("#catalog_selection").val()]["config"]["name"] + '".'});
    	var second_line = $('<div>');
    	var second_line_text = $('<span>', {text: "Change your search terms or "});
    	var second_line_link =  $('<span>', {text: " create a new dataset", class: 'link'});
    	second_line_link.click(function(){
    		show_create_dataset();
    	});
    	second_line.append(second_line_text).append(second_line_link);
    	ds.append(first_line).append(second_line);
	 	$("#dataset_list_container").append(ds);

    }
    
    function update_paging(num_datasets){
    	$(".current_page").text(current_page);
    	if (num_datasets == PAGE_LIMIT + 1){
			$(".page_right").removeClass("page_change_inalid");
			$(".page_right").addClass("page_change_valid");
		} else {
			$(".page_right").removeClass("page_change_valid");
			$(".page_right").addClass("page_change_invalid");
		}
    	if (current_page > 1){
			$(".page_left").removeClass("page_change_invalid");
			$(".page_left").addClass("page_change_valid");
		} else {
			$(".page_left").removeClass("page_change_valid");
			$(".page_left").addClass("page_change_invalid");
		}
    }
    
	function change_dataset_page(up_page){
		if (!up_page && current_page > 1) {
			current_page --;
			show_datasets();
		} else if(up_page){
			current_page ++;
			show_datasets();
		}
	}

	function show_datasets(){
		var show_dataset_callback = function(datasets){
			if (datasets == null ||datasets.length == 0){
				show_no_datasets();
				return;
			}

			update_paging(datasets.length)
			if (datasets.length == PAGE_LIMIT + 1){
				datasets.pop(); // remove the last entry
			}
						
			$.each(datasets,function (key, value){
				display_list_datasets(value);
			});
			update_table_view(datasets);
			
			display_facets();
		}
		clear_datasets();
		
		if (get_selected_catalog() != null){
			var search = get_current_escaped_search();
			var tags = get_searched_tags()
			$.merge(tags, current_view); 
			var datasets = ds_get_datasets(get_selected_catalog(),search, tags, PAGE_LIMIT+1, (current_page-1)* PAGE_LIMIT, show_dataset_callback);
		}
	}
	
	
	
	function new_dataset_callback(dataset){
		show_message("Dataset Created.", "success");
		$(".no_dataset").remove();
		display_list_datasets(dataset, true);
		dataset_table.fnAddData(get_dataset_array(dataset));
    	display_facets()
	}
	
	function array_union(array1, array2) {
	        var hash = {}, union = [];
	        $.each($.merge($.merge([], array1), array2), function (index, value) { hash[value] = value; });
	        $.each(hash, function (key, value) { union.push(key); } );
	        return union;
	}
	
	function redraw_table(){
		show_datasets();
	}
			
	var LIST_VIEW = true;
	
	
	  function get_dataset_array(dataset){
			var ds_favourite = "<span class='dataset_favourite dataset_not_favourite_icon'></span>";
	    	
	    	if ($.inArray(logged_in_user, dataset['favorite']) >= 0){
	    		ds_favourite = "<span class='dataset_favourite dataset_favourite_icon'></span>";
	    	} 
	    	
	    	dataset_array =  ["dataset", 
	    	 dataset['id'],
	         "<input type='checkbox' class='dataset_checkbox' id='check_dataset_" + dataset['id'] + "'>" + ds_favourite + "<img src=icons/database_table.png> " +
	         		"<span class='dataset_bucket_title'>" + dataset['name'] + "</span>"
	         ]
	    	$.each(current_view, function(key, value){
	    		if (dataset[value] == null){
	    			dataset_array.push("");
	    		} else if (value == "owner"){
	    			dataset_array.push(format_owner(dataset['owner']));
	    		} else if (value == "modified"){
	    			dataset_array.push(format_date(dataset[value]));
	    		} else {
	    			dataset_array.push(dataset[value]);
	    		}
	    	});
	    	return dataset_array;
	        
	    }
	  
	function update_table_view(datasets){
		initialize_datatable(datasets);
	}
	
	function initialize_datatable(datasets){
		if (dataset_table != null){
			dataset_table.fnDestroy();
			$('#dataset_table').empty();
		}
		
	
		var cols =  [{ "sTitle": "Type", "bSearchable": false, "bVisible": false, "sWidth":"200px"},
					{ "sTitle": "ID", "bSearchable": false, "bVisible": false},
					{ "sTitle": "Dataset" }	]
		$.each(current_view, function(key, value){
			cols.push({ "sTitle": value })
		});
		var data = [];
		if (datasets != null){
			$.each(datasets, function(key, value){
	     	   data.push(get_dataset_array(value));
	 	    });
		}
		
		dataset_table = $('#dataset_table').dataTable({
			"bPaginate": false, "bFilter": false, "bInfo": false, //disable search and paging
			"bAutoWidth":false,
			"aoColumns": cols,
			"aaData": data
			// "fnInitComplete": function () {
			//      dataset_table.fnAdjustColumnSizing();
			// }
		});
		
	}
	
	function create_table_view(){
		
		show_datasets();
		
		// add code to toggle check boxes on table
		$('#dataset_table tbody tr').live('click', function () {
			var row_data = dataset_table.fnGetData(this);
			if (row_data != null){
				var type = row_data[0];
				var id = row_data[1];
				$("#check_"+ type + "_" + id).attr('checked', ! $("#check_"+ type + "_" + id).attr("checked")); 
			}
		});
		
		
		$(".dataset_checkbox").live('click', function(){
			$(this).attr('checked', ! $(this).attr("checked"))
		});
		
		// code to create links on dataset names
		$('#dataset_table .dataset_bucket_title').live('click', function () {
			var row_data = dataset_table.fnGetData(this.parentNode.parentNode);
	        //var type = row_data[0];
	        var id = row_data[1];        
	        var nTr = $(this).parents('tr')[0];
	        open_close_dataset_contents(id, nTr);
	        
	    });
	}	
	
	function delete_datasets(){
		if (LIST_VIEW){
			$(".dataset_list_checkbox:checked").each(function(){
				var id = $(this).parent().parent().children('.dataset_id').text(); 
		        ds_delete_dataset(get_selected_catalog(), id);
			});
		} else {
			$(".dataset_checkbox:checked").each(function(){
				var row_data = dataset_table.fnGetData(this.parentNode.parentNode);
		        var id = row_data[1];
		        ds_delete_dataset(get_selected_catalog(), id);
			});
		}
		redraw_table();
	}
	
	function toggle_open_close_arrow(contents_element, show){
		var arrow = contents_element.closest('.dataset').find('.dataset_title_open_close');
		
		if (show){
			arrow.removeClass("dataset_title_open");
			arrow.addClass("dataset_title_close");
		} else{
			arrow.removeClass("dataset_title_close");
			arrow.addClass("dataset_title_open");	
		}
	}
	
	var table_row_id_map = {};
	
	function open_close_dataset_contents(id, contents_element){
		var dataset_tab_callback = function(dataset){
			if (LIST_VIEW){
				contents_element.append(generate_tabs(id, dataset[0], true));
				toggle_open_close_arrow(contents_element, true);
				contents_element.show();
			}else {
				dataset_table.fnOpen(contents_element, 
						"<div id='" + id +"_expand_row'></div>", 'details' );
	    		$("#" + id +"_expand_row").append(generate_tabs(id, dataset[0], false));
			}
		}
		
		if (LIST_VIEW){
			if (contents_element.is(":visible")){
				contents_element.hide();
				contents_element.children().remove();
				toggle_open_close_arrow(contents_element, false);
			} else {
				ds_get_full_dataset_info(get_selected_catalog(), id, dataset_tab_callback);
			}
		} else {
			// this is used for closing the details from within the details row..
			if (contents_element== null) {
				contents_element = table_row_id_map[id];
			}
			if (dataset_table.fnIsOpen(contents_element)){
	        	dataset_table.fnClose(contents_element);
	        } else  {
	        	table_row_id_map[id] = contents_element;
				ds_get_full_dataset_info(get_selected_catalog(), id, dataset_tab_callback);
	    	}
		}
	}
	
	function get_checked_datasets(){
		var id = [];
		if (LIST_VIEW){
			$(".dataset_list_checkbox:checked").each(function(){
				id.push($(this).parent().parent().children('.dataset_id').text()); 
			});
		} else {
			$(".dataset_checkbox:checked").each(function(){
				var row_data = dataset_table.fnGetData(this.parentNode.parentNode);
				id.push(row_data[1]);
			});
		}
		
		return id;
	}
		
	function getParameterByName(name) {
	    var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
	    return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
	}
	

	function show_main_content(){
		$("#content_view_panel").show();
		$("#navigation_content").show();
		$("#modal_configure_view").load('configure_view.html'); 
		$("#modal_create_catalog").load('create_catalog.html');
		$("#modal_create_dataset").load('create_dataset.html');
		
		ds_get_catalogs(catalog_callback);
		create_table_view();
		//create_list_view();
	}
		
	function logout(){
		ds_logout();
		$("#content_view_panel").hide();
		$("#logged_in_user").text("");
		$("#navigation_content").hide();
		$("#loggedin_information").hide();
		$("#loggedin_information2").hide();
		$("#loggedout_information").show();
		$("#login_view_panel").show();
		clear_search();
		clear_datasets();
		logged_in_user = null;
	}

	function login(){
		var username = $("#login_username").val();
		var password = $("#login_password").val();
		if (ds_authenticate(username, password) != null){
			logged_in_user = "u:"+ username;
			$("#login_view_panel").hide();
			$("#logged_in_user").text(username);
			$("#loggedin_information").show();
			$("#loggedin_information2").show();
			$("#loggedout_information").hide();	
			show_main_content();
		} else {
			alert("Authentication failed");
		}
	 }
	
	function general_error_callback(error){
		show_message(error["message"], "error");
	}
	 
	function show_message(message, type){
		show_fade_message($("#user_feedback_div"), message, type);
	}
	
	function show_fade_message(feedback_div, message, type){
		var message_div =  create_user_message(message, type);
		var fadeNeeded = false;
		var timeToFade = 0;

		if( type == "error"){
			if (ERROR_FADE > 0) {
				timeToFade = ERROR_FADE  * 1000;
			}
		} else {
			fadeNeeded = true;
			if(type == "success") {
				timeToFade = SUCCESS_FADE  * 1000;
			} else {
				timeToFade = INFO_FADE  * 1000;
			}
		}

		feedback_div.append(message_div);
		feedback_div.show();

		if(fadeNeeded) {
			var fade_div = document.getElementById(message_div.attr('id'));
			setTimeout(function() {
				$(fade_div).fadeOut(null, function() {
					$(this).remove();
				});
			}, timeToFade);
		}
	}
	
	function create_user_message(message, type){
		var uniqueMessageId = Math.floor(Math.random() * 10000 + 1);  // a unique element id so we can reference it later on.
		var message_div = $("<div>", {class: "feedback_div", id: "fb_" + uniqueMessageId});
		var html = $.parseHTML(message); 
		message_div.append(html);
		
		if (type == "error"){
			message_div.addClass("error_feedback");
		}
		else {
			if(type == "success") {
				message_div.addClass("success_feedback");
			} else {
				message_div.addClass("info_feedback");
			}
		}
		message_div.append($("<span>", {class: "close_feedback_div", text: "X"}));
		return message_div;
	}
	function add_catalog_callback(new_catalog){
		$(".no_catalog").remove();
		catalog_map[new_catalog["id"]] = new_catalog;
		var option = $('<option>',  {value:  new_catalog['id'], text: new_catalog['config']['name']});
		$("#catalog_selection_my").append(option);
    	display_facets()
		redraw_table();
	}
	
	function catalog_callback(available_catalogs){
		catalog_map = {};
		$("#catalog_selection_my").children().remove();
		$("#catalog_selection_shared").children().remove();
		$.each(available_catalogs, function(key, value) {
			catalog_map[value["id"]] = value;
			var option = $('<option>',  {value:  value['id'], text: value['config']['name']});
			if (value['config']['owner'] == logged_in_user){
				$("#catalog_selection_my").append(option);
			}else{
				$("#catalog_selection_shared").append(option);
			}
			if (selected_catalog > 0 && selected_catalog == value['id']){
				$('#catalog_selection').val(value['id']);
			}
		});
		if (available_catalogs.length <1){
			show_no_catalogs();
		} else {
			create_dataset_add_catalogs(catalog_map)
			redraw_table();
		}
	}
	
	$(document).ready(function() {
		
		// if this is a callback from the transfer picker page then we need to start the transfer
		if (getParameterByName('type') == 'transfer_callback'){
			transfer_callback();
		}
		if (getParameterByName('type') == 'transfer_finished'){
			show_transfer_message(getParameterByName('id'), getParameterByName('dest_endpoint'), getParameterByName('dest_path'));
		}

		if (getParameterByName('message') != null){
			show_message(getParameterByName('message'), "success");
		}
		
		initialize_datatable();
		$(".logout_link").click(function(){
			logout();
		});
		
		var session = ds_get_session();
		if (session != null && session['client'] != null){
			logged_in_user = session['client'];
			$("#logged_in_user").text(format_owner(logged_in_user));
			$("#loggedin_information").show();
			$("#loggedin_information2").show();
			$("#loggedout_information").hide();			
			$("#login_view_panel").hide();
			show_main_content();
		} else {
			logged_in_user = null;
			$("#content_view_panel").hide();
			$("#navigation_content").hide();
			$("#login_view_panel").show();
		}
		
		$("#login_submit").live('click', function(){
			login();
		});
		
		$('#login_password').keypress(function (e) {
			  if (e.which == 13) {
			    login();
			  }
		});
		$(".feedback_div").live("click", function(){
			var all_feedback = $(this).parent();
			$(this).remove();
			if (all_feedback.children()== null){
				all_feedback.hide();
			}
		});
		
		$("#search_box").tokenInput({
            onAdd: function (item) {
            	update_search_query();           	
            },
            onDelete: function (item) {
            	update_search_query();           	
            }});
		
		$("#search_button").live('click', function(){
			update_search_query();
		});
		
		/*$('#search_box').keypress(function (e) {
			  if (e.which == 13) {
					update_search_query();

			   // redraw_table();
			  }
		});
		*/
		$("#help_button").live('click',function(){
			$("#search_help").toggle();
		});
		
		$('.tabs a').live('click',function(e) {
	       e.preventDefault();
	       if ($(this).parent().hasClass("current_tab")){
	       	   return;       
	        }
	        else{             
		        $(this).parent().parent().parent().find(".tab_content").hide();
		        var selected = $(this).parent().parent().parent().find(".current_tab").removeClass("current_tab");
		        $(this).parent().addClass("current_tab");
		        $(this).parent().parent().parent().find('.' + $(this).attr('name')).fadeIn(); // Show content for current tab
		        $(this).parent().parent().parent().find('.' + $(this).attr('name')).addClass("current_tab");
	        }
		});
	
		
		$('.action_dropdown_wo_data').jdropdown({ 'container': '#action_menu', 'orientation': 'right',
			'items': [{'label': 'Delete'}, 
			          {'label': 'Refresh'}] });
			
			$('.action_dropdown_w_data').jdropdown({ 'container': '#action_menu', 'orientation': 'right' });
			$(document).on('jdropdown.selectItem', '#action_menu a', function(e, event){
				event.preventDefault();
				if ($(this).parent().data('jdropdown.item').label == "Delete"){
					delete_datasets();
				}
				if ($(this).parent().data('jdropdown.item').label == "Transfer"){
					transfer_dataset();
				}
				if ($(this).parent().data('jdropdown.item').label == "Refresh"){
					show_datasets();
				}
			});
			
		$('#export_dataset').click(function(){
			transfer_dataset();
		});
		
		$('#create_new_dataset_button').live('click',function(){
			show_create_dataset();
		});
		$('#create_catalog_link').live('click',function(){
			if ($.inArray(logged_in_user, can_create) > -1){
				show_create_catalog();
			} else {
				alert("You do not have permission to create a new catalog. ");
			}
		});
		
		$('.page_right').live('click',function(){
			if($(this).hasClass('page_change_valid')){
				change_dataset_page(true);
			}
		});
		$('.page_left').live('click',function(){
			if($(this).hasClass('page_change_valid')){
				change_dataset_page(false);
			} 
		});
		
		$('#view_button').live('click',function(){
				LIST_VIEW = !LIST_VIEW;
				$(this).toggleClass('config_list_view');
				$(this).toggleClass('config_table_view')
				$('#dataset_view_table').toggle();
				$('#dataset_view_list').toggle();
		});
		$('#view_select_button').live('click',function(){ 
		     show_configure_view(); 
  	    }); 
			      

		$("#catalog_selection").change(function(){
			redraw_table();
		});
	});
	
	
