
var endpoint_files = {'kyle#laptop' : {'files' : {'file1': {'size' : '1212,b'}}, 'children' : {'home' : {'files' : {'file2': {'size' : '1212'}, 'file3': {'size' : '1212'}}, 'children' : {'sub_dir' : {'files' : {'file4': {'size' : '1212'}}}} },
	'another' : {'files' : [], 'children' : {}}}},

	'vothgroup#scratch' : {'files' : {'file1': {'size' : '1212mb'}}, 'children' : {'home' : {'files' : {'file2': {'size' : '1212'}, 'file3': {'size' : '1212'}}, 'children' : {'sub_dir' : {'files' : {'file4': {'size' : '1212'}}}} },
		'another' : {'files' : [], 'children' : {}}}},	

		'go#ep1' : {'files' : {}, 'children' : {'files' : {'files' : {'file1': {'size' : '1212mb'},'file2': {'size' : '1212mb'},'file3': {'size' : '1212mb'},'file14': {'size' : '1212mb'}}, 'children' : {} },
		}},
};

var endpoints = ['go#ep1','go#ep2','faisal#apscargo','esg#esg-anl-gov'];


(function($){
	var FileSelector = function(element, options)  {
		var elem = $(element);
		var obj = this;
		var endpoint_select = null;
		var path_input = null;
		var selector_pane = null;
		var dataset_selected_files = null;
		var dataset_http_selected_files = null;
		var file_add_button = null;
		var http_files = [];	// current list of http files in this dataset..
		var dataset_files = {};	// current list of files in this dataset..
		var file_added_callback = null; // callback function when files are added...
		var file_deleted_callback = null; // callback function when files are deleted...
		var message_handler_callback = null;	// message handler function to display success/errors to users
		var dataset_id = null;
	
		var current_directory = null;
		// Merge options with defaults
		var settings = $.extend({
			param: 'defaultValue'
		}, options || {});

		// Public functions
		this.get_dataset_contents = function(){
			//return dataset_files;

			// compile a flat list of files and dirs
			var members = {}
			members["files"] = [];
			members["directories"] = [];
			
			$.each(dataset_files, function(k, endpoint){
				$.each(endpoint["files"], function (key, value){
					members["files"].push(value)
				});
				$.each(endpoint["directories"], function (key, value){
					members["directories"].push(value);
				});
			});
			return members;
		};
		
		this.reset = function(){
			dataset_files = {};
			dataset_selected_files.children().remove();
			selector_pane.children().remove();
			path_input.val(""); 
			endpoint_select.val(null);
		};
		
		this.add_file_callback = function(callback){
			file_added_callback = callback;
		};
		
		this.delete_file_callback = function(callback){
			file_deleted_callback = callback;
		};
		this.add_message_callback = function(callback){
			message_handler_callback = callback;
		};
		this.set_dataset_id = function(id){
			dataset_id = id;
		};
		
		this.get_endpoints = function(){
			var endpoints = [];
			$.each(dataset_files, function(key, value){
				if ($.inArray(value, endpoints) < 0){
					endpoints.push(key);
				}
			});
			
			return endpoints;
		}
		
		// simple function to find the shortest path.. we only count segments and pick the shortest.
		// so if two dirs are in different parts of the tree this wont work at all
		// TODO - do this properly
		// TODO also this wont work if files are added after the share - there is a lot of logic to think about here
		this.find_shortest_path = function(endpoint){
			var shortest_path = null;
			var shortest_length = 10000;
			var temp = null;
			
			var file_count = 0;
			var dir_count = 0;

			$.each(dataset_files[endpoint]['files'], function(key, value){
				file_count++;
				// For some reason paths are array sometimes?
				temp = value['path'];
				if (value['path'] instanceof Array){
					temp = value['path'][0];
				}
				if (temp.split("//").length < shortest_length){
					shortest_path = value['path'];
				}
			});
			var dir = null;
			$.each(dataset_files[endpoint]['directories'], function(key, value){
				dir = key;
				dir_count ++;
				if (value['path'].split("//").length  < shortest_length){
					shortest_path = value['path'];
				}
			});
			
			// special case.. if there is just 1 directory use that
			if (file_count ==0 && dir_count ==1){
				return dir;
			}
			
			return shortest_path;
		}
		
		this.add_files_to_dataset = function(members){
			$.each(members, function(key, member){
				
				var item = parse_globus_name(member["data_uri"]);
				var endpoint = item["endpoint"];
				var path = item["path"];
				if (endpoint == "HTTP"){
					http_files = contents;
				} else{
					if (!(endpoint in dataset_files)){	
						dataset_files[endpoint] = {'files' : {}, 'directories' :{}};
					}
					if (member["data_type"] == "file"){
						dataset_files[endpoint]['files'][path] = {name : path, id : member["id"]};
					}else{
						dataset_files[endpoint]['directories'][path] = {name : path, id : member["id"]};
					}
	
				}
			});
			show_dataset_files();
		}
		// add the selected files to the dataset model
		var add_dataset_files = function(endpoint, path, files, directories){
			//var subtree = get_sub_dir(endpoint_files[endpoint], path);
			if (!(endpoint in dataset_files)){	
				dataset_files[endpoint] = {'files' : {}, 'directories' :{}};
			}
			var added_files = {};
			var added_dirs = {};
			$.each(files,function(key,value){
				dataset_files[endpoint]['files'][path + value] = {full_name: create_globus_name(endpoint, path, value), name :  value, path : path, size : ''};
				added_files[path + value] = {full_name: create_globus_name(endpoint, path, value), name :  value, path : path, size : ''};
			});

			$.each(directories,function(key, value){
				dataset_files[endpoint]['directories'][path  + value] = {full_name: create_globus_name(endpoint, path, value), name : value, path : path, contents : ''};
				added_dirs[path  + value] = {full_name: create_globus_name(endpoint, path, value), name : value, path : path, contents : ''};
			});
			
			if (file_added_callback){
				file_added_callback(added_files, added_dirs);
			}
			show_dataset_files();
		}
		
		/*
		 * Private Functions
		 * 
		 */
		function create_globus_name(endpoint, path, name){
			return "globus://" + endpoint + path + name;
		}

		// TODO Not pretty, should update.  
		function parse_globus_name(globus_name){
			var item = {"endpoint" : "couldn't parse endpoint",
						 "path": "couldn't parse path"};
			var parts = globus_name.split("://")
			if (parts.length > 1){
				var i = parts[1].indexOf('/');
				if (i > 0){
					item["endpoint"] = parts[1].slice(0, i);
					item["path"] = parts[1].slice(i+1);
				}
			}
			
			return item;
		}

		// create a summary for an endpoint (go#ep1 2 files, 3 directories)
		function calc_summary_for_endpoint(contents){
			var num_files = 0; 
			var num_dirs = 0;
			$.each(contents['files'], function(key,value){	
				num_files++;
			});

			$.each(contents['directories'], function(key,value){	
				num_dirs ++;
			});
			return {'files': num_files, 'directories' : num_dirs };
		}

		// count the number of files in a directory for the summary
		function count_files_dirs(temp){
			var num_files = 0;
			var num_dirs = 0;

			$.each(temp['files'], function(key,value){	
				num_files++;
			});
			if ("children" in temp){
				$.each(temp['children'], function(key,value){	
					num_dirs ++;
					var count = count_files_dirs(value);
					num_files += count['files'];
					num_dirs += count['directories'];
				});
			}
			return {'files': num_files, 'directories' : num_dirs };
		}

		// show all the selected files
		function show_dataset_files(){
			dataset_selected_files.children().remove();
			dataset_http_selected_files.children().remove();
			
			$.each(http_files, function(key, value){
				var http_file = $('<div>', {class :"dataset_http_contents"});
				var http_name = $('<a>', {class :"dataset_http_contents_name", text: value['http_name'], href: value['http_path']});		var http_size = $('<div>', {class :"dataset_http_contents_size", text: value['http_size'] + " KB"});				
				http_file.append(http_name).append(http_size);
				dataset_http_selected_files.append(http_file);
			});
			

			$.each(dataset_files, function(endpoint, contents){		
				var summary = calc_summary_for_endpoint(contents);
				var dataset_block = $('<div>', {class :"dataset_contents_block"});
				var dataset_title = $('<div>', {class :"dataset_contents_title"});
				var endpoint_name =$('<span>', {class :"dataset_contents_endpoint link", text: endpoint});
				
				var file_name = " Files, ";
				if (summary['files'] == 1){ file_name = " File, "}
				
				var directory_name = " Directories)";
				if (summary['directories'] == 1){ directory_name = " Directory)"}
				
				var dataset_summary = $('<span>', {class :"dataset_contents_summary", text: "(" + summary['files']  + file_name + summary['directories'] + directory_name});
				
				var dataset_delete =  $("<img>", {class: "dataset_delete_image", src: "icons/delete.png"});
				
				dataset_title.click(function(){
					$(this).parent().children(".dataset_contents").toggle();
				});
				
				dataset_delete.click(function(){
					var deleted_members = [];
					
					$.each(dataset_files[endpoint]['files'], function(key,value){	
						deleted_members.push(value["id"]);
					});
					$.each(dataset_files[endpoint]['directories'], function(key,value){	
						deleted_members.push(value["id"]);
					});
					
					if (file_deleted_callback != null){
						file_deleted_callback(endpoint, deleted_members);
					}
					
					delete(dataset_files[endpoint]);
					show_dataset_files();
				});

				dataset_title.append(endpoint_name).append(dataset_delete).append(dataset_summary);
				var dataset_contents = $('<div>', {class :"dataset_contents", style: 'display:none;'});

				$.each(dataset_files[endpoint]['directories'], function(key,value){	
					var files = $('<div>', {class :"dataset_contents_files"});
					var img = $('<img>', {src :"icons/folder.png"});
					var file_name = $('<span>', {text: key});
					files.append(img).append(file_name);
					dataset_contents.append(files);

				});

				$.each(dataset_files[endpoint]['files'],function(key,value){	
					var files = $('<div>', {class :"dataset_contents_files"});
					var img = $('<img>', {src :"icons/page_white_text.png"});
					var file_name = $('<span>', {text: key});
					files.append(img).append(file_name);
					dataset_contents.append(files);
				});
				dataset_block.append(dataset_title).append(dataset_contents);
				dataset_selected_files.append(dataset_block);
			});
			
		}
		var add_selected_files_to_dataset = function(){
			// add all the files selected
			var selected_files = [];
			var selected_dirs = [];
			elem.find(".file_selector_checkbox:checked").each(function(){
				if ($(this).parent().hasClass('file')){
					selected_files.push($(this).parent().children(".file_selector_file").text());
				} else {
					selected_dirs.push($(this).parent().children(".file_selector_directory").text());
				}
			});
			
			add_dataset_files(endpoint_select.val(), path_input.val(), selected_files, selected_dirs);

		}

		var data_selected = function(){
			var checked = false;

			elem.find(".file_selector_checkbox").each(function(){
				if ($(this).attr("checked")){
					checked = true;
					return false;
				}
			});
			if (checked){
				file_add_button.addClass("files_selected");
				file_add_button.removeClass("files_not_selected");

			} else {
				file_add_button.addClass("files_not_selected");
				file_add_button.removeClass("files_selected");
			}       
		}

		var message_callback = function(message, type){
			if (message_handler_callback != null){
				message_handler_callback(dataset_id, message, type);
			}
		}
		
		// change the file display
		var show_file_explorer = function(endpoint, path){
			selector_pane.children().remove();

			current_directory = go_get_endpoint_ls(endpoint, path, message_callback);
			path_input.val(current_directory['path']); 
			$.each(current_directory['DATA'], function(key, value){
				selector_pane.append(create_file_row((value['type'] == "dir"), value['name'], value['size']));
			});
			
		}

		// change the file display when endpoint/path changes
		var show_endpoint_path = function(){
			show_file_explorer(endpoint_select.val(), path_input.val());
		};

		// set the initial list of endpoints 
		var set_endpoint_list = function(){
			var select = elem.find(".endpoint_select");
			select.children().remove();
			select.append( $("<option>", {text : "", value : null}));

			/*if (logged_in_user != null){
				endpoints.push(logged_in_user + "#demo");
			}*/
			
			$.each(endpoints, function (key, ep){
				var option = $("<option>", {text : ep, value :ep});
				option.change(function(){
					path_input.val('/~/'); 
					show_endpoint_path();
				});
				select.append(option);
			});
			
		};

		// create a row in the explorer for a file or directory
		var create_file_row = function(directory, name, size){
			var file_row = $("<div>", {class :"file_row"});
			var input = $("<input>", {type : 'checkbox', class :"file_selector_checkbox"});

			input.click(function(){
				data_selected();
				$(this).attr('checked', ! input.attr("checked"))

			});

			if (directory){
				file_row.addClass("directory");
				var image = $("<img>", {src : "icons/folder.png"});
				var name_div = $("<span>", {class : "file_selector_directory", text: name});
				var size_div = $("<span>", {class : "file_size", text: size});
				name_div.click(function(){
					path_input.val(path_input.val() + $(this).text() + "/");
					show_endpoint_path();
				});

			} else {
				file_row.addClass("file");
				var image = $("<img>", {src : "icons/page_white_text.png"});
				var name_div = $("<span>", {class : "file_selector_file", text: name});
				var size_div = $("<span>", {class : "file_size", text: size});
			}	

			file_row.click(function(){
				$(this).children('input').attr('checked', ! input.attr("checked"));
				data_selected();
			})


			file_row.append(input).append(image).append(name_div).append(size_div);
			return file_row;
		}


		// endpoint selector for the file selector
		var create_file_endpoint_selector = function(){
			var endpoint_selector =  ($("<div>", {class: "endpoint_selector"}));

			var endpoint_div =  ($("<div>", {class: "endpoint_div"}));
			var endpoint_selector_label =  ($("<label>", {class: "endpoint_selector_label", text: "Endpoint: "}));
			endpoint_select =  ($("<select>", {class: "endpoint_select"}));

			endpoint_select.change(function(){
				path_input.val("");
				show_endpoint_path();
			});

			endpoint_div.append(endpoint_selector_label).append(endpoint_select);

			var path_div =  ($("<div>", {class: "path_div"}));
			var path_div_label =  ($("<label>", {class: "path_input_label", text: "Path: "}));
			path_input =  ($("<input>", {class: "path_input", type: "text"}));

			// update files when leaving the path or pressing enter
			/*path_div_input.blur(function(){
    		   show_endpoint_path();
    	   });*/
			path_input.bind('keypress', function(e) {
				if(e.keyCode==13){
					path = $(this).val();
					show_endpoint_path();
				}
			});

			path_div.append(path_div_label).append(path_input);
			file_add_button =  ($("<div>", {class: "file_add_button files_not_selected"}));

			file_add_button.click(function(){
				if ($(this).hasClass("files_selected")){
					add_selected_files_to_dataset();
					
				}
			});

			endpoint_selector.append(endpoint_div).append(path_div).append(file_add_button);
			return endpoint_selector;
		}

		// control panel for the file selector
		var create_file_selector_controls = function(){
			var file_options_div =  ($("<div>", {class: "file_options_div"}));
			var select_span =  ($("<span>", {text: "Select "}));
			var select_all_span =  ($("<span>", {text: "All", class: "select_all file_options_link"}));
			var select_spacer_span =  ($("<span>", {text: " | "}));
			var select_none_span =  ($("<span>", {text: "None", class: "select_none file_options_link"}));
			var select_up_dir =  ($("<span>", {text: "Up Directory", class: "up_directory file_options_link"}));

			select_all_span.click(function(){
				elem.find(".file_selector_checkbox").each(function(){
					$(this).attr("checked",true);
				});
				data_selected();

			});

			select_none_span.click(function(){
				elem.find(".file_selector_checkbox").each(function(){
					$(this).attr("checked",false);
				});
				data_selected();
			});

			select_up_dir.click(function(){
				var path = path_input.val(); 
				if (path != '' && path != '/'){
					var path_segments = path.split("/");//.slice(1);
					if (path_segments.length == 1){
						path_input.val("/");
					}else {
						path_segments=path_segments.slice(0, path_segments.length-2);
						path_input.val(path_segments.join("/") + "/"); 
					}
				}
				show_endpoint_path();
			});

			file_options_div.append(select_span).append(select_all_span).append(select_spacer_span).append(select_none_span).append(select_up_dir);
			return file_options_div;
		}

		var create_file_selector = function(){
			var file_selector_container =  ($("<div>", {class: "file_selector_container"}));

			dataset_http_selected_files =  ($("<div>", {class: "dataset_http_selected_files"}));
			file_selector_container.append(dataset_http_selected_files);

			dataset_selected_files =  ($("<div>", {class: "dataset_selected_files"}));
			file_selector_container.append(dataset_selected_files);

			var file_selector =  ($("<div>", {class: "file_selector"}));
			file_selector.append(create_file_endpoint_selector())
			file_selector.append(create_file_selector_controls())

			selector_pane = $("<div>", {class: "file_selector_pane"});
			file_selector.append(selector_pane);

			file_selector_container.append(file_selector)
			return file_selector_container;

		}

		// Main constructor code
		elem.append(create_file_selector());
		set_endpoint_list();



	};

	$.fn.file_selector = function(options){
		// returning this.each allows multiple to be stringed together.
		return this.each(function() {
			var element = $(this);

			// Return early if this element already has a plugin instance
			if (element.data('file_selector')) return;

			// pass options to plugin constructor
			var myplugin = new FileSelector(this, options);

			// Store plugin object in this element's data
			element.data('file_selector', myplugin);
		});
	};

})(jQuery);
