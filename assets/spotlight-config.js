//GoAuth token -- replace this with actual authentication step/storage as a cookie
var GOAuthToken = "un=blaiszik|tokenid=80774510-83ae-11e3-ba6c-1231381a5994|expiry=1421963125|client_id=blaiszik|token_type=Bearer|SigningSubject=https://graph.api.test.globuscs.info/goauth/keys/81598e2a-83ae-11e3-ba6c-1231381a5994|sig=8a765f4eb44dd0417262ab6a96f7d331e6355ef2517702990a87c4456646f98ed09a382b65295cb6007edc1d4469ec533b0d925f974b31e169b64221d410e18886940dc9c2355557bf37f86dc73cea3de26e4528485d230d0d6948969a385ca134af311100793590b82727d09449813578b7ed6d623f45067e4dca64895a3637"
 
//Elasticsearch path options
//var es_url = "http://localhost:9200/";
var es_url = "http://ec2-54-201-187-254.us-west-2.compute.amazonaws.com:9200/";
var es_default_index = "globus_public_index/";
var es_default_type = "file/";
var es_default_action = "_search";
var es_default_path = es_url + es_default_index + es_default_type;

//Elasticsearch result options
var result_size = 100;
