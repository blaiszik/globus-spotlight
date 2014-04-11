//GoAuth token -- replace this with actual authentication step/storage as a cookie
var GOAuthToken = "un=blaiszik|tokenid=68d71a20-c1ac-11e3-8845-12313809f035|expiry=1428779198|client_id=blaiszik|token_type=Bearer|SigningSubject=https://nexus.api.globusonline.org/goauth/keys/84233ad4-c19d-11e3-be84-12313d2d6e7f|sig=34d1b997368681e2ddb7b64e0d984b39ef58e53f954b8b094cb4c88897d2e5943dbb27fa9923730ab2d82a52bbbc376ec2ac5b3b9267fbfc11f0249ee79fd70492a39ff12ff618db1ab04da8a4035d42f0139d958d48cc1836bc5f13ce3c43b54805a6f4cd7ae9688cedf36d100238c31f1f0bac54cd5ffbb3e5f2e133bae0e4" 

//Settings for transfer
transfer_endpoint = 'blaiszik#laptop';
transfer_path = '/';

default_destination_path = "/Users/argonne/Desktop/Experiment Data"
default_destination_endpoint = "blaiszik#laptop";

//Settings for endpoint listing
var ep_counter = 0;
var ep_limit = 25;

var ep_destination_counter = 0;
var ep_destination_limit = 25;


//Elasticsearch path options
//var es_url = "http://localhost:9200/";
//var es_url = "http://ec2-54-201-187-254.us-west-2.compute.amazonaws.com:9200/";
//var es_url = "http://54.186.21.3:9200/";
var es_url = "http://search.globuscs.info:9200/";
var es_default_index = "globus_public_index/";
var es_default_type = "file,publish/";
var es_default_action = "_search";
var es_default_path = es_url + es_default_index + es_default_type;

//Elasticsearch result options
var result_size = 100;

//var es_client_url = "http://ec2-54-201-187-254.us-west-2.compute.amazonaws.com:9200";
//var es_client_url = "http://54.186.21.3:9200/"
var es_client_url = "http://search.globuscs.info:9200/"
var es_client_default_index = "globus_public_index";
var es_client_default_type = "file,publish";
var es_client_default_action = "_search";
var es_client_default_path = es_client_url + es_client_default_index + es_client_default_type;

var es_client_current_index = es_client_default_index;
var es_client_current_type = es_client_default_type;
var es_client_current_alias = es_client_default_index;
var es_client_current_endpoint_filter = '';
var es_client_current_collection_filter = '';
