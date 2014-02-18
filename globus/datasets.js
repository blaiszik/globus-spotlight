var ignore_facets = ["name", "incomplete","modified", "modified by","created","tags present",
                     "subject last tagged", "subject last tagged txid","read users","write users",
                     "latest with name", "name", "version created", "vname", "version", "id", 
                     "readok","writeok", "share-users", "dataset_reference","data_type",
                     "data_uri","data_id","share-endpoint"] //tags to ignore for facets
var tags_dont_show = ['owner', 'favorite', 'catalog'];	//tags that are shown elsewhere that we shouldn't allow to be editied

var ds_url_base = "/service/dataset";
var tf_url_base = "/tagfiler";

var goauth_cookie = "globusonline-goauth"

function format_user(user){
	if (user.length > 2){
		return user.slice(2);
	}	
	return user;
}
function format_owner(owner){
	return format_user(owner)
}

function ds_logout(){
    $.removeCookie(goauth_cookie);
}

function make_basic_auth(user, password) {
    var tok = user + ':' + password;
    var hash = btoa(tok);
    return "Basic " + hash;
}

function ds_nexus_user_query(query){
	$.ajax({
		async: false,
		type: 'GET',
		dataType: 'json',
		url: '/service/nexus/search?query=' + query,
		error: function(xhr, status, error) {
			result = null;
		},
		success: function(json) {
			result = json;
		}
	});
	var res = []
	$.each(result["results"], function(key, val){
		res.push({label : val["fullname"] + " (" + val["username"] +")", value : val["username"]});
	});
	return res;
}

function ds_authenticate(username, password){
	ds_logout()
    // token = $.cookie(goauth_cookie);
    // if (token)
    //     return token;
    
	var result = {};
	$.ajax({
		async: false,
		type: 'GET',
		dataType: 'json',
		url: '/service/nexus/goauth/token?grant_type=client_credentials',
		headers: { Authorization: make_basic_auth(username, password) },
		error: function(xhr, status, error) {
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

function ds_get_session(){
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
			results = null;
		},
		success: function(json) {
			results = { "client": json[0] };
		}
	});
	return results;
}

// general request method
function ds_request(type, path, data, callback, error_callback){
	var results = null;
	if (data!= null){
		$.ajax({url: ds_url_base + path, 
			cache: false,
			async: (callback != null), 
			headers: { "Content-Type": "application/json", "Accept": "application/json" },
			type: type, 
			data: JSON.stringify(data),
			dataType: 'json',
			success: function(json) {
				if (callback != null){
						callback(json, path, null);
				}
				results = json;
			},
			error: function(xhr, status, error) {
				if (error_callback != null){
					error_callback(JSON.parse(xhr.responseText), path, data);
				}
			}
		});
	} else {
		$.ajax({url: ds_url_base + path, 
			cache: false,
			async: (callback != null),
			headers: { "Content-Type": "application/json", "Accept": "application/json" },
			type: type, 
			dataType: 'json',
			success: function(json) {
				if (callback != null){
						callback(json, path, null);
				}
				results = json;
			},
			error: function(xhr, status, error) {
				if (error_callback != null){
					error_callback(JSON.parse(xhr.responseText), path, null);
				}
			}
		});
	}
	return results;
}

function ds_get_dataset_id_from_path(path){
	var start = path.indexOf("dataset/id=");
	if (end < 0){ return null; }
	var end = path.indexOf("/", start + 11);
	if (end < 0){ end = path.length; }
	return path.slice(start + 11, end);
}
//perform a query request -- encode query in url
function ds_request_query(type, path, query, tags, offset_limit, callback, error_callback){
	//return ds_request(type, path + "/" + _escape_string(query) + "(" + tags.join(";") + ")" + offset_limit , null, callback, error_callback);
	return ds_request(type, path + "/" + _escape_string(query) + offset_limit , null, callback, error_callback);
}

function _convert_annotation_list_to_string(in_array){
	var tags_string =  in_array.join(";");
	tags_string = _escape_string(tags_string);
	return tags_string;
}

// TODO work out what needs to be escaped
function _escape_string(tags_string){
	tags_string = encodeURIComponent(tags_string);
	// ensure we keep =s signs
	tags_string =  tags_string.replace(/%3D/g,"=");
	tags_string =  tags_string.replace(/%3B/g,";");
	// we need to keep :s for the query
	tags_string =  tags_string.replace(/%3A/g,":");

	// escape (s
	tags_string =  tags_string.replace(/\(/g,"%28");
	tags_string =  tags_string.replace(/\)/g,"%29");

	return tags_string;
}



/*
 * 
 *  Catalog manipulation
 *  
 */
function ds_get_catalogs(callback, error_callback){	
	//return ds_request("GET", "/catalog", null, callback, error_callback);
	// TODO The following is a temporary change to get catalogs from TF rather than DS API
	var results = null;
	$.ajax({url: ds_url_base + "/catalog", 
		async: (callback != null), 
		headers: { "Content-Type": "application/json", "Accept": "application/json" },
		type: "GET", 
		dataType: 'json',
		success: function(json) {
			if (callback != null){
					callback(json);
			}
			results = json;
		},
		error: function(xhr, status, error) {
			if (error_callback != null){
				error_callback(JSON.parse(xhr.responseText));
			}
		}
	});
	return results;
}

function ds_create_catalog(owner, name, description, admin_read, admin_write, read, write, callback, error_callback){	
	var data = {config: {name: name, description: description}};
	
	// API doesnt allow null to be set.
	if (admin_read != null){
		data['config']['read_users'] = admin_read;
	}
	if (admin_write != null){
		data['config']['write_users'] = admin_write;
	}
	if (read != null){
		data['config']['content_read_users'] = read;
	}
	if (write != null ){
		data['config']['content_write_users'] = write;
	}
	
	//return ds_request("POST", "/catalog", data, callback, error_callback);
	// TODO revert this. Temporarily hit the TF service for catalog interactions
	var results = null;
	$.ajax({url: ds_url_base + "/catalog", 
		async: (callback != null), 
		headers: { "Content-Type": "application/json", "Accept": "application/json" },
		type: "POST", 
		data: JSON.stringify(data),
		dataType: 'json',
		success: function(json) {
			if (callback != null){
				callback(json);
			}
			results = json;
		},
		error: function(xhr, status, error) {
			if (error_callback != null){
				error_callback(JSON.parse(xhr.responseText), data);
			}
		}
	});
	return results;
	
}

/*
 *
 * dataset manipulation
 * 
 */
// create a dataset with annotations and members

function ds_create_dataset(catalog_id, dataset, callback, error_callback){
	var data = {name: dataset["name"]};
	var created_callback = function(created_dataset){ 
		if (dataset["members"]["files"].length > 0 || dataset["members"]["directories"].length > 0){
			ds_add_members(catalog_id, created_dataset["id"], dataset["members"]["files"], dataset["members"]["directories"], null, error_callback);
		}
		if (!$.isEmptyObject(dataset["annotations"]["label"])){
			ds_set_annotations(catalog_id, created_dataset["id"], dataset["annotations"], null, error_callback);
		}
		callback(created_dataset);
	}
	return ds_request("POST", "/catalog/id=" + catalog_id + "/dataset", 
			data, created_callback, error_callback);
}

// get all datasets
function ds_get_datasets(catalog_id, query, annotations, limit, offset, callback, error_callback){
	
	var offset_limit = "";
	var offset_limit = ((limit > 0) ? "?limit=" + limit : ""); 
	if (offset > 0 && offset_limit != ""){ 
		offset_limit += "&offset=" + offset;
	}else if (offset > 0){ 
		offset_limit += "?offset=" + offset;
		}

	var requested_annotations = "";
	dataset_annotations = ["name", "id", "owner", "modified", "label"];
	annotations = annotations.concat(dataset_annotations);
	if (annotations != null){ 
		 requested_annotations =  _convert_annotation_list_to_string(annotations);
	}
	// TODO - really we should be able to use the same function here. 
	if (query == null || query == ""){
		return ds_request("GET", "/catalog/id=" + catalog_id + "/dataset/name/annotation/" 
				+ requested_annotations + offset_limit,
				null, callback, error_callback);
	} else {
		return ds_request("GET", "/catalog/id=" + catalog_id + "/dataset/" + _escape_string(query) 
				+ "/annotation/" + requested_annotations + offset_limit , null, callback, error_callback);
	}

}
// get single dataset
// TODO can't pass in search tags so its not very useful
/*function ds_get_dataset(catalog, id, tags, callback){
	var search_tags = base_dataset_tags;
	if (tags != null && tags.length > 0){
        	search_tags = search_tags.concat(tags);
	}
	return ds_request_query("GET", "/catalog/id=" +catalog + "/dataset", 
			"id=" + id, search_tags, callback, null);

}*/

// delete dataset
function ds_delete_dataset(catalog_id, dataset_id, callback, error_callback){
	return ds_request("DELETE", "/catalog/id=" + catalog_id + "/dataset" + 
			"/id=" + dataset_id, null, callback, error_callback);

}

// Get all the user tags for the dataset 
// TODO - would be good if there was a shortcut to do this in 1 call
function ds_get_full_dataset_info(catalog_id, dataset_id, callback, error_callback){
	var result = ds_get_annotations(catalog_id, dataset_id, ["annotations_present"], null, error_callback);
	annotations = result[0]["annotations_present"];
	annotations.push("annotations_present");
	return ds_get_annotations(catalog_id, dataset_id, annotations, callback, error_callback);
}

/*
*
* Annotation manipulation
* 
*/
function ds_get_annotations(catalog_id, dataset_id, annotation_list, callback, error_callback){
	var requested_annotations = "";
	if (annotation_list != null){ 
		 requested_annotations =  _convert_annotation_list_to_string(annotation_list);
	}
	return ds_request("GET", 
			"/catalog/id=" + catalog_id + "/dataset/id="  + dataset_id + "/annotation/" + requested_annotations, 
			null, callback, error_callback);
}

function ds_set_annotations(catalog_id, dataset_id, annotation_dict, callback, error_callback){
	return ds_request("POST", 
			"/catalog/id=" + catalog_id + "/dataset/id="  + dataset_id + "/annotation", 
			annotation_dict, callback, error_callback);
}

function ds_set_annotation(catalog_id, dataset_id, annotation_name, annotation_value, callback, error_callback){
	var data = {};
	data[annotation_name]= annotation_value;
	ds_set_annotations(catalog_id, dataset_id, data, callback, error_callback);
}


function ds_delete_annotation(catalog_id, dataset_id, annotation_name, annotation_value, callback, error_callback){
	var data = {};
	return ds_request("DELETE", 
			"/catalog/id=" + catalog_id + "/dataset/id="  + dataset_id + 
			"/annotation/" + _escape_string(annotation_name) +"=" + _escape_string(annotation_value), 
			null, callback, null);
}

/*
*
* Annotation definitions
* 
*/
function ds_get_annotation_type_list(){
	return {"text":"Text",
		"boolean" :"Boolean (true or false)",
		"timestamptz":"Date and time with timezone",
		"date":"Date (yyyy-mm-dd)",
		"float8":"Floating point",
		"int8":"Integer",
		"url":"URL"}
}

function ds_get_annotation_definitions(catalog_id, callback, error_callback){
	return ds_request("GET", 
			"/catalog/id=" + catalog_id + "/annotation_def", 
			null, callback, error_callback);
}

function ds_get_annotation_definition(catalog_id, annotation_name, callback, error_callback){
	return ds_request("GET", 
			"/catalog/id=" + catalog_id + "/annotation_def/" + _escape_string(annotation_name), 
			null, callback, error_callback);
}


function ds_create_annotation_definition(catalog_id, annotation_name, type, multi, callback, error_callback){
	data = {"value_type" : type, "multivalued": multi, "unique": false}
	return ds_request("PUT", 
			"/catalog/id=" + catalog_id + "/annotation_def/" + _escape_string(annotation_name), 
			data, callback, error_callback);
}

/*
 * 
 * Members
 * 
 * 
 */
function ds_get_members(catalog_id, dataset_id, query, callback, error_callback){
	return ds_request("GET", 
			"/catalog/id=" + catalog_id + "/dataset/id="  + dataset_id + "/member", 
			null, callback, error_callback);
}

function ds_add_members(catalog_id, dataset_id, files, directories, callback, error_callback){
	var data = []
	// GO Format "globus://owner#epname/path"
	$.each(files, function (key, value){
		data.push({"data_uri": value["full_name"], "data_type": "file"})
	});
	$.each(directories, function (key, value){
		data.push({"data_uri": value["full_name"], "data_type" :"directory"});
	});
	if (data.length> 0){
		return ds_request("POST", 
				"/catalog/id=" + catalog_id + "/dataset/id="  + dataset_id + "/member", 
				data, callback, error_callback);
	}
}
function ds_delete_members(catalog_id, dataset_id, members, callback, error_callback){
	$.each(members, function (key, value){
		ds_request("DELETE", 
				"/catalog/id=" + catalog_id + "/dataset/id="  + dataset_id + "/member/id=" + value, 
				null, null, null);
	});
}

/*
*
* Member Annotation manipulation
* 
*/
//alert(JSON.stringify(ds_set_member_annotations(8, 52, 53, {"label": "API"})));
//alert(JSON.stringify(ds_get_member_annotations(8, 52, 53, ["label", "data_uri"])));

function ds_get_all_member_annotations(catalog_id, dataset_id, member_id, callback, error_callback){
	var result = ds_get_member_annotations(catalog_id, dataset_id,  member_id,["annotations_present"], null, error_callback);
	if (result == null || result.length <1){
		return null;
	}
	annotations = result[0]["annotations_present"];
	annotations.push("annotations_present");
	return ds_get_member_annotations(catalog_id, dataset_id,  member_id, annotations, callback, error_callback);
}

function ds_get_member_annotations(catalog_id, dataset_id, member_id, annotation_list, callback, error_callback){
	var requested_annotations = "";
	if (annotation_list != null){ 
		 requested_annotations =  _convert_annotation_list_to_string(annotation_list);
	}
	return ds_request("GET", 
			"/catalog/id=" + catalog_id + "/dataset/id="  + dataset_id + "/member/id=" + member_id + 
			"/annotation/" + requested_annotations, 
			null, callback, error_callback);
}

function ds_set_member_annotations(catalog_id, dataset_id, member_id, annotation_dict, callback, error_callback){
	return ds_request("POST", 
			"/catalog/id=" + catalog_id + "/dataset/id="  + dataset_id + "/member/id=" + member_id + 
			"/annotation", 
			annotation_dict, callback, error_callback);
}

function ds_set_member_annotation(catalog_id, dataset_id, member_id, annotation_name, annotation_value, callback, error_callback){
	var data = {};
	data[annotation_name]= annotation_value;
	ds_set_member_annotations(catalog_id, dataset_id, member_id, data, callback, error_callback);
}


function ds_delete_member_annotation(catalog_id, dataset_id, member_id, annotation_name, annotation_value, callback, error_callback){
	var data = {};
	return ds_request("DELETE", 
			"/catalog/id=" + catalog_id + "/dataset/id="  + dataset_id + "/member/id=" + member_id + 
			"/annotation/" + _escape_string(annotation_name) +"=" + _escape_string(annotation_value), 
			null, callback, null);
}

/*
 * 
 * ACLS
 * 
 */
function ds_get_acls(catalog_id, dataset_id, callback, error_callback){
	return ds_request("GET", 
			"/catalog/id=" + catalog_id + "/dataset/id=" + dataset_id+ "/acl", 
			null, callback, error_callback);
}

function ds_get_user_acls(catalog_id, dataset_id, username, callback, error_callback){
	return ds_request("GET", 
			"/catalog/id=" + catalog_id + "/dataset/id=" + dataset_id+ "/acl/user/" + username, 
			null, callback, error_callback);
}
// user_perms is a dict of form {username: permissions}
function ds_set_acls(catalog_id, dataset_id, user_perms, callback, error_callback){
	data = [];
	$.each(user_perms,function(user, perm){
		data.push({"principal_type" : "user", "permission" : perm, "principal" : user});
	});
	
	return ds_request("POST", 
			"/catalog/id=" + catalog_id + "/dataset/id=" + dataset_id + "/acl", 
			data, callback, error_callback);
}

function ds_delete_acls(catalog_id, dataset_id, username, callback, error_callback){
	return ds_request("DELETE", 
			"/catalog/id=" + catalog_id + "/dataset/id=" + dataset_id+ "/acl/user/" + username, 
			null, callback, error_callback);
}

/*
 * Facets
 * 
 */
function ds_get_facets(catalog_id, annotation_list, query, callback, error_callback){
	if (query == null || query == ""){ query = "name"; }
	// range=count will give the number of values for each tag. 
	return ds_request("GET", 
			"/catalog/id=" + catalog_id + "/dataset/" + _escape_string(query) + "/annotation/" + 
			_escape_string(annotation_list.join(';')) + "?range=values&versions=latest", 
			null, callback, error_callback);
}

