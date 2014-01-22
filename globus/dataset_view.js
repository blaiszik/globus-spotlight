// TABS CREATION
var tabs = ["Overview", "Tags", "Sharing", "Select Files","Members"];
var selected_tab = 0;

	function generate_tabs(id, dataset, list){
		var dataset_contents = ($("<div>", {class: 'dataset_contents'}));
		if (list){
			dataset_contents.addClass('expanded_dataset_list_contents');
		}
		var tabs_headers = ($("<ul>", {class: 'tabs',style: "clear:left;"}));
		var contents = [tabs.length];

		// create the tab headers and the contents for each tab
		$.each(tabs, function (key, value){
			var tab_header = ($("<li>")).append($("<a>", {name: "tab" + key, text: value, href: "#", class: "tab" + key}));
			if (key == selected_tab){
				tab_header.addClass("current_tab")
				contents[key] =  ($("<div>", {class: "tab_content tab" + key +" current_tab"}));
			} else {
				contents[key] = ($("<div>", {class: "tab_content tab" + key, style:"display: none;"}));
			}
			tabs_headers.append(tab_header);
		});
		
		var close_all =  ($("<div>", {name: "clas_all", text: "X",  class: "close_dataset_contents"}));

		close_all.click(function(){
			if (list){
				var id = $(this).closest('.dataset').children('.dataset_id').text(); 
				var ds_contents = $(this).closest('.dataset_contents').parent();
				open_close_dataset_contents(id, ds_contents);
			} else {
				var id = $(this).closest('.dataset_contents').find('.dataset_id').text(); 
				// not sure how to get the reference to the 'parent' row
				// var nTr = $(this).parents('tr')[0];
			    open_close_dataset_contents(id, null);
			}
		});
		
		tabs_headers.append(close_all);
		
		var tabs_contents = ($("<div>", {class: 'content'}));
		tabs_contents.append($("<div>", {class: 'dataset_id', style:"display:none;", text: id}));	
		tabs_contents.append($("<div>", {class: 'dataset_feedback_div feedback_id_' + id, style:"display:none;"}));	

		contents[0].append(create_general_info(dataset));
		contents[1].append(generate_tags_tab(id, dataset));
		contents[2].append(generate_sharing_tab(id));
		
		var file_load_callback = function(json){
			contents[3].append(generate_file_tab(id, json));
			contents[4].append(generate_members_tags_tab(id, dataset, json));
		}
		var file_error_callback = function(json){
			contents[2].append(generate_file_tab(id, null));
		}
		ds_get_members(get_selected_catalog(), id, null, file_load_callback, file_error_callback);

		$.each(contents, function(key, value){
			tabs_contents.append(value);
		});
	
		
		dataset_contents.append(tabs_headers).append(tabs_contents);
		return dataset_contents;
	}
	
	function show_dataset_message(id, message, type){
		var feedback_div = $(".feedback_id_"+ id);
		show_fade_message(feedback_div, message, type);
	}

	function generate_tags_tab(id, dataset){
			var tag_div = ($("<div>", {class: 'tag_editor_div'}));
			tag_div.tag_editor();
			var tag_editor = tag_div.data('tag_editor');
			
			var tags_changed_callback = function(){
		  	  	display_facets();
			}
			
			tag_editor.set_dataset_id(id);
			tag_editor.set_dataset(dataset);
			tag_editor.set_dataset_owner(dataset["owner"]);
			tag_editor.set_catalog_id(get_selected_catalog());
			tag_editor.set_logged_in_user(logged_in_user);
			tag_editor.add_tags_changed_callback(tags_changed_callback);
			tag_editor.add_message_callback(show_dataset_message);
			tag_editor.display();
			return tag_div;
	}

	function generate_members_tags_tab(id, dataset, members){
		var tag_div = ($("<div>", {class: 'tag_editor_div tag_members_editor members_' + id}));
		tag_div.tag_editor();
		var tag_editor = tag_div.data('tag_editor');
		
		var tags_changed_callback = function(){
	  	  	display_facets();
		}
		tag_editor.set_dataset_id(id);
		tag_editor.set_dataset(dataset);
		tag_editor.set_dataset_owner(dataset["owner"]);
		tag_editor.set_members(members);
		tag_editor.set_members_tab(true);
		tag_editor.set_catalog_id(get_selected_catalog());
		tag_editor.set_logged_in_user(logged_in_user);

		//tag_editor.add_tags_changed_callback(tags_changed_callback);
		tag_editor.add_message_callback(show_dataset_message);
		tag_editor.display();
		return tag_div;
}
	
// OVERVIEW TAB
	function create_general_info(dataset){
		var general_info = $("<div>", {class: "general_info"});
		//var general_info_title = $("<div>", {class: "dataset_info_title", text: "General"});
		//general_info.append(general_info_title);
		var name = $("<div>", {text: "Name: "+  dataset['name']});
		var owner = $("<div>", {text: "Owner: "+  format_owner(dataset['owner'])});
		//var catalog = $("<div>", {text: "Catalog: "+  dataset['catalog']});
		var created = $("<div>", {text: "Created: "+  format_date(dataset['created'])});
		var modified = $("<div>", {text: "Last modified: " + format_user(dataset['modified by']) +  
			" (" + format_date(dataset['modified']) + ")"});

		//general_info.append(name).append(owner).append(catalog).append(modified);
		general_info.append(name).append(owner).append(created).append(modified);
		return general_info;
	}
	
	
	function create_general_sharing_info(dataset){
		var sharing_info = $("<div>", {class: "sharing_info"});
		var sharing_info_title = $("<div>", {class: "dataset_info_title", text: "Sharing"});
		sharing_info.append(sharing_info_title);
		
		var read = $("<div>", {text: "Read: none"});
		var write = $("<div>", {text: "Write: none"});
		
		if (dataset["read users"]){
			var read = $("<div>", {text: "Read: " + dataset["read users"]});
		} 
		if (dataset["write users"]){
			var write = $("<div>", {text: "Write: " + dataset["write users"]});
		}else 
		sharing_info.append(read).append(write);
		return sharing_info;
	}
	 
	function create_file_summary(contents){
		var file_summary = $("<div>", {class: "file_summary"});
		file_summary.append($("<div>", {class: "dataset_info_title", text: "Dataset Contents"}));

		var summary = {} 	// create a summary by endpoint
		$.each(contents, function(key, value){
			if (summary[value["endpoint"]] == null){
				summary[value["endpoint"]] = {'files' :{}, 'directories' : {}};			
			}
			
			if ($.inArray("directory_name", value["annotations_present"]) && value['directory_name'] != null){
				summary[value["endpoint"]]['directories'][value['id']] = value['directory_name'];
			}
			if ($.inArray("file_name", value["annotations_present"]) && value['file_name'] != null){
				summary[value["endpoint"]]['files'][value['id']] = value['file_name'];
			}
		});
		
		$.each(summary, function(key, value){
			var ep = $("<div>", {text: key, class: 'endpoint_name'});
			file_summary.append(ep);
			
			var dataset_contents = $("<div>");
			$.each(value['directories'], function(dir_key, dir_value){
				var files = $('<div>', {class :"dataset_contents_files dataset_contents"});
				var img = $('<img>', {src :"icons/folder.png"});
				var file_name = $('<span>', {text: dir_value, id: "tfid-" + dir_key});
				files.append(img).append(file_name);
				dataset_contents.append(files);
			});
			
			$.each(value['files'], function(file_key, file_value){
				var files = $('<div>', {class :"dataset_contents_files dataset_contents"});
				var img = $('<img>', {src :"icons/page_white_text.png"});
				var file_name = $('<span>', {text: file_value, id: "tfid-" + file_key});
				files.append(img).append(file_name);
				dataset_contents.append(files);
			});
			
			file_summary.append(dataset_contents);
		});
		return file_summary;

		
	}
	
// SHARING TAB	
	function generate_sharing_tab(dataset_id, acls){
		//alert(JSON.stringify(acls));
		//var can_edit = (logged_in_user == dataset['owner']);
		var can_edit = true;
		var sharing_tab = ($("<div>", {class: 'sharing_tab ' + dataset_id+ '_sharing_pane'}));
		var sharing_title = ($("<div>", {class: 'tab_title', text: ""}));
		
		var sharing_feedback = ($("<div>", {class: "sharing_creation_feedback", style: "display:none;"}));
		sharing_tab.append(sharing_title).append(sharing_feedback);
		
		var sharing_row = ($("<div>", {class: 'sharing_row sharing_title_row'}));
		var sharing_user = ($("<div>", {class: 'sharing_username_div', text: "User name"}));
		var sharing_policy = ($("<div>", {class: 'sharing_policy_div', text: "Sharing Policy"}));

		var sharing_read = ($("<div>", {class: 'sharing_read_div', text:"Read"}));
		var sharing_write = ($("<div>", {class: 'sharing_write_div', text:"Write"}));
		sharing_row.append(sharing_user).append(sharing_policy).append(sharing_read).append(sharing_write);
		sharing_tab.append(sharing_row);
		
		if (can_edit){
			var add_sharing_row = generate_add_new_sharing(dataset_id);
			sharing_tab.append(add_sharing_row);
		}
		
		var sharing_users_row = ($("<div>", {class: 'sharing_users_row'}));
		//generate_sharing_user_rows(dataset_id, sharing_users_row, acls, can_edit)
		sharing_tab.append(sharing_users_row);
		
		update_sharing_acls(dataset_id, sharing_users_row)
		
		var sharing_save_div = ($("<div>", {class: 'sharing_save_div'}));
		
		if (can_edit){
			sharing_tab.append(sharing_save_div);
		}
		return sharing_tab;
	}

	function get_read_write_permissions(perms){
		var perm_dict = {'read' : false, 'write' : false};
		if (perms.indexOf("r") > -1){
			perm_dict['read'] = true;
		}
		if (perms.indexOf("w") > -1){
			perm_dict['write'] = true;
		}
		return perm_dict
	}
	
	function update_sharing_acls(dataset_id, sharing_users){
		if (sharing_users == null){
			sharing_users = $("." + dataset_id +"_sharing_pane").find(".sharing_users_row");
		}
		sharing_users.children().remove();
		var sharing_callback = function(json){
			// TODO we need a way to get the owner here, so that we cant delete the owner's read/write
			generate_sharing_user_rows(dataset_id, sharing_users, json, true, false)
		}
		ds_get_acls(get_selected_catalog(), dataset_id, sharing_callback, null);
	}
	
	function generate_sharing_user_rows(dataset_id, sharing_users_row, acls, can_edit, owner){
		sharing_users_row.children().remove();
		$.each(acls, function(index, val){
			perm_dict = get_read_write_permissions(val['permission']);
			sharing_users_row.append(
				create_sharing_user_row(dataset_id, val['principal'], perm_dict['read'], perm_dict['write'], "share_metadata", can_edit, owner));
		
		});	
	}
	

	function generate_add_new_sharing(dataset_id){
		// add sharing row
		var add_sharing_row = ($("<div>", {class: 'sharing_row'}));
		var add_sharing_user = ($("<div>", {class: 'sharing_username_div'}));
		var add_sharing_input = ($("<input>", {type: "text", class: 'sharing_username_input'}));
		

		 add_sharing_input.autocomplete({
			 minLength: 2,
			 source: function(request, response){
				 response( ds_nexus_user_query(request.term))
			 }
		});
		
		
		add_sharing_user.append(add_sharing_input);
		
		
		var sharing_policy = create_sharing_policies(false);

		var add_sharing_read = ($("<div>", {class: 'sharing_read_div'}));
		add_sharing_read.append($("<input>", {class: 'sharing_checkbox', type: 'checkbox'}));
		var add_sharing_write = ($("<div>", {class: 'sharing_write_div'}));
		add_sharing_write.append($("<input>", {class: 'sharing_checkbox', type: 'checkbox'}));
		
		var sharing_add =  ($("<img>", {class: "sharing_row_image", src: "icons/add.png"}));
		sharing_add.click(function(){
			var id = $(this).closest('.content').children('.dataset_id').text();
			var name = $(this).parent().children('.sharing_username_div').children('.sharing_username_input').val();
			var read = $(this).parent().children('.sharing_read_div').children('.sharing_checkbox').prop('checked');
			var write = $(this).parent().children('.sharing_write_div').children('.sharing_checkbox').prop('checked');
			var sharing_policies = $(this).parent().children('.sharing_policy_div').children('.sharing_policies').val();
			//$(this).parent().parent().children('.sharing_users_row').append(create_sharing_user_row(name, read, write, sharing_option_text[sharing_policies], true));
			add_sharing_permission(id, name, read, write, sharing_policies);
		});

		add_sharing_row.append(add_sharing_user).append(sharing_policy).append(add_sharing_read).append(add_sharing_write).append(sharing_add);
		return add_sharing_row;
	}
	
	function create_sharing_user_row(dataset_id, user, read, write, policy, can_edit, owner){
		var sharing_row = ($("<div>", {class: 'sharing_row sharing_content_row'}));
		var sharing_user = ($("<div>", {class: 'sharing_username_div', text: user}));		
		var sharing_policy = ($("<div>", {class: 'sharing_policy_div', text: "Dataset Metadata"}));
		var sharing_read = ($("<div>", {class: 'sharing_read_div'}));
		sharing_read.append($("<input>", {type: 'checkbox', class : 'sharing_checkbox', checked: read, disabled:"disabled"}));
		var sharing_write = ($("<div>", {class: 'sharing_write_div'}));
		sharing_write.append($("<input>", {type: 'checkbox', class : 'sharing_checkbox',checked: write, disabled:"disabled"}));
		
		sharing_policy.text(sharing_option_text[policy]);	
		sharing_row.append(sharing_user).append(sharing_policy).append(sharing_read).append(sharing_write);
		
		if(!owner){
			var sharing_delete = ($("<img>", {src: 'icons/cancel.png'}));
			sharing_delete.click(function(){
				ds_delete_acls(get_selected_catalog(), dataset_id, user, sharing_changed_callback, sharing_error_callback)
			});
			sharing_row.append(sharing_delete);
		}
		return sharing_row;
	}
	
	function add_sharing_permission(dataset_id, name, read, write, sharing_policies){
		user_perms = {};
		user_perms[name] = "";
	    if (read){ user_perms[name] = "r"};
	    if (write){ user_perms[name] = "rw"};
		ds_set_acls(get_selected_catalog(), dataset_id, user_perms, sharing_changed_callback, sharing_error_callback);
	}
	
	function sharing_changed_callback(json, path, input_data){
		var dataset_id = ds_get_dataset_id_from_path(path);
		//var sharing_message = $("." + dataset_id +"_sharing_pane").find(".sharing_creation_feedback");
		show_dataset_message(dataset_id, "Sharing options updated.", "success");
		// regenerate the whole sharing list
		update_sharing_acls(dataset_id, null);
	}
	
	function sharing_error_callback(json, path, input_data){
		var dataset_id = ds_get_dataset_id_from_path(path);
		//var sharing_message = $("." + dataset_id +"_sharing_pane").find(".sharing_creation_feedback");
		show_dataset_message(dataset_id, "Sharing could not be updated.", "error");
	}
	
	
		
	// TODO we should compose a query to TF .. but that is too slow, grab it from the fileselector instead
	//{"go#ep1":{"files":{"/~/.profile":{"name":".profile","path":["/~/"],"size":"2"}},"directories":{"/~/godata":{"name":"godata","path":"/~/","contents":null}}}
	/*function get_endpoint_files(sharing_tab, dataset){
		var file_selector = null;
		var file_selector_div = sharing_tab.parent().parent().find(".file_selector_div");
		// Check if there is already a file selector
		// for the popup sharing this wont have been created so we need to create one
		if (sharing_tab.length == 0 || file_selector_div.length == 0){
			// create a file selector just so we can get the file summary..
			var file_div = ($("<div>", {class: 'file_selector_div'}));
			file_div.file_selector();
			file_selector = file_div.data('file_selector');
			var all_files = ds_get_members(get_selected_catalog(), dataset['id'], null);
			file_selector.add_files_to_dataset(get_dataset_contents(all_files));
		} else {
			file_selector = file_selector_div.data('file_selector');
		}
		var contents = file_selector.get_dataset_contents();
		var endpoint = file_selector.get_endpoints();
		
		if (endpoint.length == 0 || endpoint.length > 1){
			alert("Cant share data either empty or more than 1 endpoint");
		}
		var shortest_path = file_selector.find_shortest_path(endpoint[0]);
		
		return {'endpoint' : endpoint[0], "path" : shortest_path};
	}*/
	
	
	//var sharing_option_text = {'share_metadata' : 'Only Metadata','share_both' : 'Entire Dataset'};
	var sharing_option_text = {'share_metadata' : 'Only Metadata'};
	
	function create_sharing_policies(selected){
		var sharing_policy_div = $("<div>", {class: "sharing_policy_div"});

		var sharing_info = $("<select>", {class: "sharing_policies"});
		$.each(sharing_option_text, function(key, value){
			sharing_info.append($("<option>", {value: key, text: value}));
		});
		
		sharing_policy_div.append(sharing_info);
		return sharing_policy_div;
	}
	
	function concat_arrays(array1, array2){
		if (array1 != null && array2 != null){
			var combined = $.merge([], array1);			
			$.each(array2, function(key,val){
				if ($.inArray(val, combined) < 0){
					combined.push(val);
				}
			});
			return combined;
		} else if(array1 != null){
			return array1;
		} else {
			return array2;
		}
	}
	
// FILE TAB	
	function get_dataset_contents(dataset){
		var contents = {};
		contents["HTTP"] = []
		$.each(dataset, function(key, value){	

			// if this is an HTTP reference (BD BIRN) separate it out 
			if ($.inArray("http_path", value["annotations_present"]) && value["http_path"] != null){
				contents["HTTP"].push({'http_path' : value["http_path"],'http_size' : value["http_size"],'http_name' : value["http_name"]})
			} else {
	
				if ($.inArray("endpoint", value["annotations_present"]) && contents[value["endpoint"]] == null){
					contents[value["endpoint"]] = {'files' :{}, 'directories' : {}};			
				}
	
			
				if ($.inArray("directory_name", value["annotations_present"]) && value['directory_name'] != null){
					contents[value["endpoint"]]['directories'][value['id']] = {name: value['directory_name'], path: value['directory_path']}
				}
				if ($.inArray("file_name", value["annotations_present"]) && value['file_name'] != null){
					contents[value["endpoint"]]['files'][value['id']] = {name: value['file_name'], path: value['file_path'], size: "2"};
				}
			}
		});

		return contents
	}
	
	function generate_file_tab(id, members){
		var file_div = ($("<div>", {class: 'file_selector_div'}));
		file_div.file_selector();
		var file_selector = file_div.data('file_selector');
		
		var add_file_callback = function(files, dirs){
			ds_add_members(get_selected_catalog(), id, files, dirs, null, null)
			
			// find member annotations list and update it..
			var member_tag_div = file_div.closest(".dataset_contents").find(".tag_members_editor");
			var tag_editor = member_tag_div.data('tag_editor');
			tag_editor.update_member_list();
		}
		
		
		var delete_file_callback = function(endpoint, members){
			ds_delete_members(get_selected_catalog(), id, members, null, null)
			
			// find member annotations list and update it..
			var member_tag_div = file_div.closest(".dataset_contents").find(".tag_members_editor");
			var tag_editor = member_tag_div.data('tag_editor');
			tag_editor.update_member_list();
		}
		
		if (members != null){
			file_selector.add_files_to_dataset(members);
		}
		file_selector.set_dataset_id(id);
		file_selector.add_file_callback(add_file_callback);
		file_selector.delete_file_callback(delete_file_callback);
		file_selector.add_message_callback(show_dataset_message);
		return file_div;
		
	}
	
	
