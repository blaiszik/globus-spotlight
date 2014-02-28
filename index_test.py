import sys
import json
import re
import os
import ConfigParser
import io
 
from datetime import datetime, timedelta
from optparse import OptionParser
import urllib2
import json
import elasticsearch

def create_endpoint_list(num_endpoints):
    endpoint_list = []
    for x in range(0, num_endpoints):
        endpoint_url = es_url+"ep-%s"%(x)
        endpoint_list.append({"url":endpoint_url})
    return endpoint_list

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

    try:
        es = elasticsearch.Elasticsearch()
    except:
        print 'Could not connect to Elasticsearch'

    ep_list = create_endpoint_list(10000)

    doc_list = create_doc_type_list(10000)


    for ep in endpoint_list:
        for doc_type in doc_list:
            print 1     


