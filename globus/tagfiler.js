/*
 * Synchronous client for Tagfiler. Ideally we should modify this to make it asynchronous. 
 * 
 */
var ignore_facets = ["dataset_name", "incomplete","modified", "modified by","created","tags present",
                     "subject last tagged", "subject last tagged txid","read users","write users",
                     "latest with name", "name", "version created", "vname", "version", "id", 
                     "readok","writeok", "share-users"] //tags to ignore for facets
var tags_dont_show = ['owner', 'favorite', 'catalog'];	//tags that are shown elsewhere that we shouldn't allow to be editied

// list of tags we want back for files/directories
var file_tags = ['id', 'tags present', 'dataset_reference', 'endpoint', 'directory_name', 'directory_path', 'file_name', 'file_path', 'http_path', 'http_size', 'http_name'];
var base_dataset_tags = ["id", "dataset_name", "owner", "tags present", "modified", "label", "favorite"];

var goauth_cookie = "globusonline-goauth"
	
function tf_set_read_write_permissions(catalog, id, users, sharing_callback){
	var current_read = tf_get_tag_value(catalog,id, 'read users')[0]['read users'];
	var current_write = tf_get_tag_value(catalog,id, 'write users')[0]['write users'];
	if (current_read == null){
		current_read = [];
	}
	if (current_write== null){
		current_write = [];
	}
	var read_add = [];
	var write_add = [];
	var read_delete = [];
	var write_delete = [];

	$.each(users, function(key, value){
		var read_exists = ($.inArray(value['name'], current_read) >= 0);
		var write_exists = ($.inArray(value['name'], current_write) >= 0);
		if (value['read'] && !read_exists){
			read_add.push(value['name']);
		} else if (!value['read'] && read_exists){
			read_delete.push(value['name']);
		}
		if (value['write'] && !write_exists){
			write_add.push(value['name']);
		} else if (!value['write'] && write_exists){ 
			write_delete.push(value['name']);
		}
	})

	if (read_add.length > 0 || write_add.length > 0){
		tf_set_multiple_tags(catalog,id, {'read users': read_add, 'write users': write_add});
		tf_set_read_write_on_files(catalog, id, read_add, write_add);

	} 

	// TODO must be an efficient way to delete multiple tags??
	$.each(read_delete, function(index, val){
		tf_delete_tag_value(catalog,id, 'read users', val);
	});
	$.each(write_delete, function(index, val){
		tf_delete_tag_value(catalog,id, 'write users', val);
	});

	sharing_callback(id, null, true);
}


// TODO - this isnt a good approach but cant find a way to bulk update tags on all files/dirs
function tf_set_read_write_on_files(catalog, id, read_users, write_users){
	var callback_function = function(result){
		$.each(result, function(key, value){
			tf_set_multiple_tags(value['id'], {'read users': read_users, 'write users': write_users});			
		});
	}
	tf_get_files_for_dataset(catalog, id, callback_function)
}

function set_file_dir_permissions_callback(){
}


function tf_logout(){
    $.removeCookie(goauth_cookie);
}

function make_basic_auth(user, password) {
    var tok = user + ':' + password;
    var hash = btoa(tok);
    return "Basic " + hash;
}

function tf_authenticate(username, password){
    token = $.cookie(goauth_cookie);
    if (token)
        return null;
	var result = {};
	$.ajax({
		async: false,
		type: 'GET',
		dataType: 'json',
		url: '/service/nexus/goauth/token?grant_type=client_credentials',
		headers: { Authorization: make_basic_auth(username, password) },
		error: function(xhr, status, error) {
			//alert("ERROR Logging in " + error + ")");
			result = null;
		},
		success: function(json) {
			result = json;
		}
	});
	if (result == null){
		return  null;
	}
    token = result["access_token"];
    $.cookie(goauth_cookie, token, { expires: 7 });
	return result;
}
function tf_get_session(){
	var results = null;
	token = $.cookie(goauth_cookie);
	if (!token)
		return null;
	m = token.match(/un=([^|]*)/);
	username = "u:" + m[1];
	$.ajax({
		async: false,
		url: '/tagfiler/user/' + username,
		type: 'GET',
		dataType: 'json',
		error: function(xhr, status, error) {
			//alert("ERROR Getting session " + error + ")");
			results = null;
		},
		success: function(json) {
			results = { "client": json[0] };
		}
	});
	return results;
}

function tf_get_full_dataset_info(catalog, id, callback){
	var results = null;
	// TODO we should cache tags present somewhere rather than making a whole call to get it..
	var result = tf_get_dataset_tags(catalog, id, ["tags present"], null);
	return tf_get_dataset_tags(catalog, id, result[0]["tags present"], callback);
}

var tf_url_base = "/tagfiler"
var tagfiler_base = "/tagfiler/catalog/2/";

function tf_get_catalogs(callback){	
	var results = null;
	$.ajax({url: tf_url_base + '/catalog', 
		async: (callback != null), 
		type: 'GET', 
		dataType: 'json',
		success: function(json) {
			if (callback != null){
				callback(json);
			}
			results = json;
		}
	});
	return results;
}

function tf_create_catalog(owner, name, description, admin, read, write,callback){	
	var results = null;
	admin.push(owner);
	read.push(owner);
	write.push(owner);

	$.ajax({url: tf_url_base + '/catalog', 
		async: (callback != null), 
		headers: { "Content-Type": "application/json", "Accept": "application/json" },
		type: 'POST', 
		data: JSON.stringify({name: name, description: description, admin_users: admin, read_users: read,  write_users: write}),
		dataType: 'json',
		success: function(json) {
			if (callback != null){
				callback(json);
			}
			results = json;
		}
	});
	return results;
}

function tf_get_dataset_tags(catalog, id, tags, callback){
	var requested_tags = "";
	var results = null;
	if (tags != null){ 
		requested_tags = "("+ _convert_list_to_string(tags) + ")";
	}
	$.ajax({url: tf_url_base + '/catalog/' + catalog + '/tags/id=' + id + requested_tags, 
		async: (callback != null), 
		type: 'GET', 
		dataType: 'json',
		success: function(json) {
			if (callback != null){
				callback(json);
			}
			results = json;
		}
	});
	return results;
}

/*
function tf_get_full_dataset_info(id, callback){
	var results = null;
	// TODO we should cache this info somewhere rather than making a whole call to get it..
	$.ajax({url: '/tagfiler/tags/id=' + id, 
		async: (callback != null), 
		type: 'GET', 
		dataType: 'json',
		success: function(json) {
			if (callback != null){
				callback(json);
			}
			results = json;
		}
	});
	return results;
}*/



function _convert_list_to_string(in_array){
	var tags_string =  in_array.join(";");
	tags_string = _escape_string(tags_string);
	return tags_string;
}

function tf_get_datasets(catalog, query, tags, callback){
	var search_tags = base_dataset_tags;
	if (tags != null && tags.length > 0){
        	search_tags = search_tags.concat(tags);
	}

	if (query == ""){
		return tf_get_subjects_query(catalog ,"dataset_name", search_tags, callback);
	} else {
		// basic encode of #, TODO need to change the query mechanism to pass in a list here so we can just encode names/values
		query = query.replace("#", "%23");
		return tf_get_subjects_query(catalog, "dataset_name;" + query, search_tags, callback);
	}
}
/*
function tf_get_files_for_datasets(dataset_id){
	var dataset = {};
	dataset["dataset"] = tf_get_full_dataset_info(dataset_id)[0];
	dataset["contents"] = tf_get_subjects_query("dataset_reference=" + dataset_id);
	return dataset;
}*/


function tf_get_files_for_dataset(catalog, dataset_id, callback){
	return tf_get_subjects_query(catalog, "dataset_reference=" + dataset_id, file_tags, callback);
}

function tf_get_subjects_query(catalog,query, tags, callback){
	var results = "";
	var requested_tags = "";
	if (tags != null){
		requested_tags = "("+ _convert_list_to_string(tags) + ")";
	}
	$.ajax({
		async: (callback != null),
		headers: { "Content-Type": "application/json", "Accept": "application/json" },
		url: tf_url_base + '/catalog/' + catalog + '/subject/' + query + requested_tags,
		type: 'GET',
		dataType: 'json',
		accepts: 'text/uri-list',
		error: function(xhr, status, error) {
			//alert("ERROR Getting all datasets (Error " + error + ")");
			if (callback){
				callback(null);
			}
			results = null;
		},
		success: function(json) {
			if (callback){
				callback(json);
			}
			results = json;
		}
	});

	return results;
}

//var test_dataset = {"name":"test4","catalog":"None","owner":"kyle","tags":{"kyle-js-test":"tag2","label":["tag1"]},"contents":{"kyle#laptop":{"files":{"/file1":{"name":"file1","path":"","size":"1212mb"}},"directories":{"/home":{"name":"home","path":"","contents":{"files":{"file2":{"size":"1212"},"file3":{"size":"1212"}},"children":{"sub_dir":{"files":{"file4":{"size":"1212"}}}}}}}}}};
function tf_create_dataset(catalog, dataset, callback){
	var id = tf_create_subject(catalog, dataset, "dataset", callback)
}
	
function tf_create_subject(catalog, subject, type, callback){
	if (type== "dataset"){
		var url =tf_url_base + '/catalog/' + catalog + '/subject/dataset_name=' + subject['name'];
	} else if (type=="file") {
		var url =tf_url_base + '/catalog/' + catalog + '/subject/file_name=' + subject['name'];
	} else if (type=="directory") {
		//alert("SETTING DIR");
		var url =tf_url_base + '/catalog/' + catalog + '/subject/directory_name=' + subject['name'];
	}
	var subject_id ="";
	 $.ajax({
		 async:(callback != null),
         url: url,
         type: 'POST',
         error: function(xhr, status, error) {
        	 if (callback != null){
     	 			callback(null, false, error);
     	 	 } else{
     	 		alert("Error creating subject " + url + " (Error "+ error + ")") ;
     	 	 }        	 

         },
         success: function(html) {
        	 // TODO THIS IS BAD - TAGFILER IGNORES OUR REQUEST FOR JSON AND RETURNS
        	 // HTML SO WE HAVE TO PARSE IT HERE TO FIND THE ID OF THE CREATED DATASET
        	 var start = html.indexOf("/subject/id=")
        	 subject_id = html.substring(start+12);
        	 subject_id = subject_id.replace(/\s/g, '');	// remove new line character
        	 // TODO not at all efficient - I think they have a bulk interface -- need to check
        	 if (type== "dataset"){
        		 //subject['unstructured_tags']['catalog'] = subject["catalog"];
        		 tf_add_multiple_tags(catalog, subject_id, subject['tags'], true);
        		 tf_update_tag_url(catalog, subject_id, subject['unstructured_tags'])
        		 tf_add_files(catalog, subject_id, subject['contents'])
         		 
        		 //tf_set_tag(subject_id, "catalog", subject["catalog"]);
        	 } 
        	if (callback != null){
        	 	callback(subject_id, true,"");
        	 	return false;
         	}
         }
     });  
	 return subject_id;
}
//var dataload =[{"file_name": "anotherfilename", "endpoint": 'kyle#endpoint',    "file_path": '/hello/asd/',    "file_size" : '12',   "dataset_reference" : '436'},
//               {"directory_name": "some", "endpoint": 'kyle#endpoint',    "directory_path": '/sd/',  "dataset_reference" : '436'}];

function bulk_file_creation(catalog, files){
	// Bulk creation requires a unique name.... 
	// as we dont show this to users we will create a fake unique name based on the id, endpoint,path,and filename
	// if there are collisions we cant show the same file twice anyway..
	var url = tf_url_base + '/catalog/' + catalog + "/subject/name(endpoint;dataset_reference;directory_path;directory_name;file_path;file_size;file_name)";
	var send_data = [];
	$.each(files, function(key, value){
		if ('directory_name' in value){
			value['name'] = value['dataset_reference'] + "_" + value['endpoint'] + "_" + value['directory_path'] + "_" + value['directory_name']; 
		} else {
			value['name'] = value['dataset_reference'] + "_" + value['endpoint'] + "_" + value['file_path'] + "_" + value['file_name']; 
		}
		send_data.push(value);
	});
	bulk_subject_creation(url, send_data)
}
function bulk_subject_creation(url, data){
	 $.ajax({
        url: url,
        type: 'PUT',
        contentType:"application/json;",
        data: JSON.stringify(data),
        error: function(xhr, status, error) {
        	alert("error "+error) 	; 
        },success: function (json){
        	//alert("success" + json)
        }
	 });

}

// expects {ep : {files: [path1: {name: name, endpoint: endpoint, file_path: file_path, file_size:file_size}]
//				  {directories: [path1: {name: name, endpoint: endpoint, directory_path: directory_path}]
function tf_add_files(catalog, id, contents){
	var files = [];
	$.each(contents, function (endpoint, endpoint_contents){
		$.each( endpoint_contents['files'], function (key, value){
			files.push({"endpoint": endpoint,  "file_name": value["name"], "file_path": value["path"],   "file_size" : value["size"],  "dataset_reference" : id})
		});
		$.each(endpoint_contents['directories'], function (key, value){
			files.push({"endpoint": endpoint, "directory_name": value["name"], "directory_path" :value["path"], "dataset_reference": id});
		});
	});
	if (files.length> 0){
		bulk_file_creation(catalog, files);
	}
}

function tf_add_files_and_dirs(catalog, id, endpoint, files, directories){
	var send_data = []
	$.each(files, function (key, value){
		send_data.push({"endpoint": endpoint,  "file_name": value["name"], "file_path": value["path"],   "file_size" : value["size"],  "dataset_reference" : id})
	});
	$.each(directories, function (key, value){
		send_data.push({"endpoint": endpoint, "directory_name": value["name"], "directory_path" :value["path"], "dataset_reference": id});
	});
	if (send_data.length> 0){
		bulk_file_creation(catalog, send_data);
	}
}

/*
function tf_add_files(id, contents){
	$.each(contents, function (endpoint, endpoint_contents){
		tf_add_files_and_dirs(id, endpoint, endpoint_contents['files'], endpoint_contents['directories'])
	});
}

function tf_add_files_and_dirs(id, endpoint, files, directories){
	$.each(files, function (key, value){
		value["dataset_id"] = id;
		value["endpoint"] = endpoint;
		tf_create_subject(value, "file");
	});
	$.each(directories, function (key, value){
		value["dataset_id"] = id;
		value["endpoint"] = endpoint;
		tf_create_subject(value, "directory");
	});
}*/

// Delete files and directories that are associated with a dataset
function tf_delete_files_and_dirs(catalog, id, endpoint, files, dirs){
	var results = tf_get_subjects_query("dataset_reference=" + id + ";endpoint=" + endpoint.replace("#", "%23"),file_tags, null);
	$.each(results, function(index, value){
		if ($.inArray(value['directory_path'] + value['directory_name'],dirs) >= 0){
			tf_delete_subject(catalog, value["id"]);
		}
		if ($.inArray(value['file_path'] + value['file_name'],files) >= 0){
			tf_delete_subject(catalog, value["id"]);
		}
	});
}

// set multiple tags - create new tags if they dont already exist. 
function tf_add_multiple_tags(catalog, id, tags, multi){
	$.each(tags,function(name, value){
		tf_add_tag(catalog, id, name, value, "text", multi);
	});
}
function tf_add_tag(catalog, id, name, value, type, multi, callback){
	if (!tf_tag_exists(catalog, name)){
		tf_create_tag_definition(catalog, name, type, multi);
	}
	if ($.isArray(value)){
		if (multi){
			tf_set_multiple_tag_values(catalog, id, name, value, callback);
		} else{
			alert("cant set single valued tag to array");
		}
	} else {
			tf_set_tag(catalog, id, name, value, callback);
	}
}

// TODO I think this can be batched? not sure how as the tagname is unique in the body
function tf_set_multiple_tag_values(catalog, id, tag_name, tag_values, callback){
	$.each(tag_values,function(index, val){
		tf_set_tag(catalog, id, tag_name, val);
	});
	if (callback != null){
		callback(catalog, id, {tag_name : tag_values}, true);
	}
}

function tf_delete_dataset(catalog, id){
	tf_delete_subject(catalog, id);
	var files = tf_get_subjects_query(catalog, "dataset_reference=" + id, null, null);
	$.each(files, function(index, value){
		tf_delete_subject(catalog, value["id"]);
	});
}

function tf_delete_subject(catalog, id){
	$.ajax({
        url: tf_url_base + '/catalog/' + catalog + '/subject/id=' + id,
        type: 'DELETE',
        error: function(xhr, status, error) {
       	 alert("Error deleting subject " + id + " (Error "+ error + ")") ;
        }
    }); 
}


//check if a tag name already exists - there's probably a better way to check this
function tf_tag_exists(catalog, tag_name){
	var result = false;
	$.ajax({async:false, 
		url: tf_url_base + '/catalog/' + catalog + '/tagdef/' + tag_name, 
		type: 'GET', 
		dataType: 'json',
		success: function(json) {
			result = true;
		},
		error: function(xhr, status, error){
			if (xhr.status == 409 || xhr.status == 404){
				result = false;			
			} else {
				alert("Unkown error checking tag " + xhr.status);
			}
		}
		
	});
	return result;
} 

function tf_get_type_list(){
	return {"text":"Text",
		"boolean" :"Boolean (true or false)",
		"timestamptz":"Date and time with timezone",
		"date":"Date (yyyy-mm-dd)",
		"float8":"Floating point",
		"int8":"Integer",
		"url":"URL"}
}
// create a new tag definition
function tf_create_tag_definition(catalog, tag_name, type, multi_valued){
	
	if (type == null){
		type= "text";
	} 
	var mv = "false";
	if (multi_valued){
		mv = "true";
	}

	$.ajax({
		async: false,
		type: 'PUT',
		url: tf_url_base + '/catalog/' + catalog +'/tagdef/' +tag_name + "?dbtype=" + type + "&multivalue=" + mv + "&readpolicy=anonymous&writepolicy=anonymous",
		success: function(json) {
			return true;
		},
		error: function(xhr, status, error){
			alert("error creating tag definition " + " (Error "+ error + ")");
			return false;
		}
	});
}

function tf_delete_tag_value(catalog, id, tag_name, tag_value){
	tf_delete(catalog, id, tag_name + "=" + tag_value);
}

function tf_delete_tag(catalog, id, tag_name){
	tf_delete(catalog, id, tag_name);
}

function tf_delete(catalog, id, delete_path){
	$.ajax({
		async:false,
        	url: tf_url_base + '/catalog/' + catalog +'/tags/id=' + id + "(" + delete_path + ")",
        	type: 'DELETE',
        	error: function(xhr, status, error) {
       	 		alert("Error deleting tag" + id + " (Error "+ error + ")");
			return false;
        	},
        	success: function() {
	       		return true;
		}
       });
}

//tf_set_multiple_tags('331', {'int-tag': 10, 'label': 'multi'});
// set multipe tags of the form {name: val,name: val};
function tf_set_multiple_tags(catalog, id, tags, callback){
	tf_update_tag_url(catalog, id, tags, callback);
	// TODO if this is too long we can use the body
	/*params = {};
	params['action'] = 'put';
	$.each(tags, function (name, value){
		params['set-' + name]= 'true';
		params['val-' + name]= value;
	});
	tf_update_tag(id, params, callback);*/
}


function tf_set_tag(catalog, id, tag_name, tag_value, callback){
	params = {};
	params[tag_name] = tag_value;
	tf_update_tag_url(catalog, id, params, callback)
}

//https://tagfiler-local.globuscs.info/tagfiler/query/id=126(read%20users)
//alert(JSON.stringify(tf_get_tag_value('126', 'read users')));
function tf_get_tag_value(catalog, id, tag_name){
	//alert("tg_get_tag_value is not supported"); 
	var results = {};
	$.ajax({
	    async:false,
	    url: tf_url_base + '/catalog/' + catalog +'/tags/id=' + id +'('+ tag_name + ')',
	    type: 'GET',
		dataType: 'json',
		headers: { 
	        "Accept" : "application/json; charset=utf-8",
	        "Content-Type": "application/json; charset=utf-8"
	    },
		error: function(xhr, status, error) {
	   	 	alert("Error getting tag for " + tag_name + " " + id + "(Error "+ error + ")");
	    },
	    success: function(json) {
	    	results = json;
	    }
	}); 
	return results;	
}


// update tags by the url - easiest way to bulk upload multiple tags
/// tf_update_tag_url('331', {'int-tag': 10, 'label': ['multi', '22']});
function tf_update_tag_url(catalog, id, params, callback){
	var tags_string = "";
	$.each(params, function(key, value){
		if (value instanceof Array && value.length > 0){
			tags_string+= key + "=" + value.join(",") + ";";
		} else {
			tags_string+= key + "=" + value + ";";
		}
	});
	tags_string = tags_string.slice(0,-1);
	tags_string =  tags_string.replace(/ /g,"%20");
	tags_string =  tags_string.replace(/#/g,"%23");
	tags_string =  tags_string.replace(/:/g,"%3A");

	$.ajax({
		 async:false,
        url: tf_url_base + '/catalog/' + catalog +'/tags/id=' + id + "(" + tags_string+ ")",
        type: 'PUT',
        error: function(xhr, status, error) {
       	 //alert("Error updating tag" + id + " (Error "+ error + ")");
       	 if (callback != null){
       		 callback(id, params, false);
       	 }
        },
        success: function() {
       	 if (callback != null){
       		 callback(id, params, true);
       	 }
       }
        
    }); 
}

function _escape_string(tags_string){
	tags_string =  tags_string.replace(/ /g,"%20");
	tags_string =  tags_string.replace(/#/g,"%23");
	return tags_string;
}
// This doesnt work - we cant set all tags on a query?
function tf_set_all_dataset_files_tag(catalog, id, tag_name, value){
	params = {};
	params['action'] = 'put';
	params['set-' + tag_name]= 'true';
	params['val-' + tag_name]= username;
	
	 $.ajax({
		async:false,
        url: tf_url_base + '/catalog/' + catalog +'/tags/dataset_reference=' + id,
        type: 'POST',
        data: params,
        error: function(xhr, status, error) {
       	 alert("Error updating all files' tags" + id + " (Error "+ error + ")");
        },
        success: function() {
        	alert("Updated all files");
       }
        
    }); 
}

//https://tagfiler-local.globuscs.info/tagfiler/query/(owner)?versions=latest&range=values
//alert (JSON.stringify(tf_get_facets(['owner', 'share-endpoint'])));
function tf_get_facets(catalog, tag_names, query, callback){
	var results = {};
	var async = (callback != null);
	
	$.ajax({
		async: async,
        url: tf_url_base + '/catalog/' + catalog +'/subject/' + query + '('+ tag_names.join(';') + ')?versions=latest&range=values',
        type: 'GET',
		dataType: 'json',
		headers: { 
	        "Accept" : "application/json; charset=utf-8",
	        "Content-Type": "application/json; charset=utf-8"
	    },
		error: function(xhr, status, error) {
			//ignore errors here it just wont show anything..
       	 	//alert("Error getting facets for " + tag_names + " (Error "+ error + ")");
        },
        success: function(json) {
        	if (callback != null){
        		callback(json);
        	}
        	results = json;
        }
    }); 
	return results;
}
