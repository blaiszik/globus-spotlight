import sys
import json
import re
import os
import ConfigParser
import io
from pprint import pprint 

from datetime import datetime, timedelta
from optparse import OptionParser
import urllib2
import json
import elasticsearch

def create_endpoint_list(num_endpoints):
    endpoint_list = []
    for x in range(0, num_endpoints):
        endpoint_name = "ep-%s"%(x)
        endpoint_list.append({"ep_name":endpoint_name})
    return endpoint_list

def load_json_data():

    json_data=open('./test_data/Actors-lg.json')
    data = json.load(json_data)
    pprint(data)
    json_data.close()

def create_doc_type_list(num_doc_types):
    doc_type_list = []
    for x in range(0, num_doc_types):
        doc_type = "doc-%s"%(x)
        doc_type_list.append({"doc_type":doc_type})
    return doc_type_list

def add_to_es(subject):
        req = urllib2.Request(es_url + "catalog/", json.dumps(subject))
        req.get_method = lambda: 'POST'
        print req
        if index_es:
            out = urllib2.urlopen(req)
            print out.read()

if __name__ == "__main__":

    ep_list = ''
    doc_list = ''
    es_url = "http://localhost:9200/"
    index_es = True  
    num_endpoints = 10000 
    num_doc_types = 5

    try:
        es = elasticsearch.Elasticsearch()
    except:
        print 'Could not connect to Elasticsearch'

    ep_list = create_endpoint_list(num_endpoints)

    doc_list = create_doc_type_list(num_doc_types)

    x = 1
    for ep in ep_list:
        for doc in doc_list:
            print es_url+ep['ep_name']+'/'+doc['doc_type']

            if x%num_doc_types == 0:
                pass
        x = x+1    

    load_json_data()


