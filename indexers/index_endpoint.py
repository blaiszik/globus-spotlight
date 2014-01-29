#!/home/kyle/virtualenv/go_transfer_api/bin/python
 
# pip install globusonline-transfer-api-client
# Running python app
# ./transfer_client.py kyle -goauth $(cat /home/kyle/goauth-token)
import os
import sys

from globusonline.catalog.client.operators import Op
from globusonline.transfer import api_client
 
from datetime import datetime, timedelta
from optparse import OptionParser
import urllib2
import json
import elasticsearch
from pymongo import MongoClient

def create_catalog(catalog_client):
    config ={"name":"Spotlight"}
    catalog_client.create_catalog(config=config)
    print catalog_client.get_catalogs()
 
def create_tagdefs(catalog_client, catalog_id):
    catalog_client.create_tagdef(catalog_id, "group", "text")
    catalog_client.create_tagdef(catalog_id, "file_name", "text")
    catalog_client.create_tagdef(catalog_id, "last_modified", "date")
    catalog_client.create_tagdef(catalog_id, "user", "text")
    catalog_client.create_tagdef(catalog_id, "path", "text")
    catalog_client.create_tagdef(catalog_id, "type", "text")
    catalog_client.create_tagdef(catalog_id, "size", "int8")
    catalog_client.create_tagdef(catalog_id, "endpoint", "text")
 
def create_es_index():
    for es_url in es_urls:
        req = urllib2.Request(es_url)
        req.get_method = lambda: 'PUT'
        out = urllib2.urlopen(req)
        print out.read()
 
def add_to_mongo(subjects):
    m_collection = m_default_collection
    index_time = str(datetime.now())
    for subject in subjects:
        subject['index_date'] = index_time
        print 'Adding to Mongo:'+json.dumps(subject)
    m_db[m_collection].insert(subjects)


def add_to_es(subject):
    for es_url in es_urls:    
        req = urllib2.Request(es_url + "file/", json.dumps(subject))
        req.get_method = lambda: 'POST'
        print req
        if index_es:
            out = urllib2.urlopen(req)
            print out.read()
 
def create_subject(subject_data):
    add_to_es(subject_data)
    if index_catalog:
        subject_data['read users'] = ['*']
        result = catalog_client.create_subject(catalog_id, subject_data)
 
def show_index(index_name=None):
    if index_name:
        m_collection = m_db[index_name]
    else:
        m_collection = m_default_collection    

    for entry in m_collection.find():
        print entry

def get_files(transfer_client, ep, path="/"):
    code, reason, data = transfer_client.endpoint_ls(ep,path)
    index_data = []

    for f in data['DATA']:
        tags = f
        tags['path'] = path
        tags['endpoint'] = ep
        tags['file_name'] = f['name']
        tags['type'] = f['type']
        print tags
        # del tags['link_target']
        # del tags['permissions']
        # del tags['DATA_TYPE']
        # del tags['name']
        if f['type'] == 'dir':
            try:
                del tags['size']
                print os.path.join(path, tags['file_name'])
                get_files(transfer_client, ep, os.path.join(path, tags['file_name']))
            except:
                print "error @ "+json.dumps(tags)
        create_subject(tags)
        index_data.append(tags)
    if index_mongo:
        add_to_mongo(index_data)
 
def process_endpoints(transfer_client, endpoints_to_index):
    for endpoint in endpoints_to_index:
        code, reason, result = transfer_client.endpoint_autoactivate(endpoint, if_expires_in=600)
        get_files(transfer_client, endpoint)
 
def query_files(catalog_client, catalog_id):
    return catalog_client.get_subjects_by_query(catalog_id,
                                  [("file_name", Op.TAGGED)],
                                  ["file_name", "id"]).body
 
def delete_all(catalog_client, catalog_id):
    all = query_files(catalog_client, catalog_id)
    for a in all:
        catalog_client.delete_subject(catalog_id, a["id"])

##############

#Index-related variables
index_mongo = False              #Set True to send info to Mongo
index_es = False                 #Set True to send info to Elasticsearch
index_catalog = False           #Set True to send info to Globus Catalog
index_fields = "canonical_name" #Which field to gather for the endpoints

index_limit = 2                 #Endpoint number to index
index_offset = 1                #Offset for endpoint list

#Transfer API token
token="un=blaiszik|tokenid=a513c130-61be-11e3-b1f9-1231391ccf32|expiry=1418231719|client_id=blaiszik|token_type=Bearer|SigningSubject=https://nexus.api.globusonline.org/goauth/keys/a54b835e-61be-11e3-b1f9-1231391ccf32|sig=1c317b08ad98818749b4ff06e0f34f09784e4dbb30c3b809f136822651af99b8e77295e820e47384c0c90f12013b9729e3174e5551c7feec6f0ac8a1cb29b08be741fe64c8749c55583f3092b937ebe5eae15968e2613302105b68a00b58d50b023807177df659b1167416efdac32bc2bee146b43531629edd1f8a5b1807e727" 
 
catalog_id = 3
#endpoint_list = ({"canonical_name":"blaiszik#test_index"},{"canonical_name":"go#ep2"})
endpoint_list = ({"canonical_name":"go#ep1"},{"canonical_name":"go#ep2"})


tagfiler_url="https://localhost/tagfiler"

#List of Elasticsearch Nodes to push data towards
#es_urls = ["http://localhost:9200/globus_public_index/","http://ec2-54-201-187-254.us-west-2.compute.amazonaws.com:9200/globus_public_index/"]
es_urls = ["http://localhost:9200/globus_public_index/"]

#es_url = "http://localhost:9200/globus_public_index/"
mongo_database = "test"

m_client = ''
m_db = ''
m_default_collection = 'spotlight_ben'

transfer_client = api_client.TransferAPIClient("blaiszik", goauth=token)

if index_mongo:
    try:
        m_client = MongoClient('localhost', 27017)
        m_db = m_client[mongo_database]
        m_default_collection = 'globus_public_index'
    except:
        print 'Could not connect MongoClient'

if index_es:
    try:
        es = elasticsearch.Elasticsearch()
        # res = es.search(index="spotlight_goep2,spotlight_ben", body={"from" : 0, "size" : 1000,"query": {"wildcard" : { "type" : "f*"}}})
        # print res
    except:
        print 'Could not connect to Elasticsearch'

endpoints_to_index = []
for endpoint in endpoint_list:
    #print endpoint['canonical_name']
    endpoints_to_index.append(endpoint['canonical_name'])
print endpoints_to_index
process_endpoints(transfer_client, endpoints_to_index)