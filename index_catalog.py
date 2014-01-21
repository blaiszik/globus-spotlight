import sys
import json
import re
import os
import ConfigParser
import io

from catalog_wrapper import *
from globusonline.catalog.client.operators import Op, build_selector
 
from datetime import datetime, timedelta
from optparse import OptionParser
import urllib2
import json
import elasticsearch
from pymongo import MongoClient

def add_to_es(subject):
        req = urllib2.Request(es_url + "catalog/", json.dumps(subject))
        req.get_method = lambda: 'POST'
        print req
        if index_es:
            out = urllib2.urlopen(req)
            print out.read()

if __name__ == "__main__":

    es_url = "http://localhost:9200/globus_public_index/"
    index_es = True   

    try:
        es = elasticsearch.Elasticsearch()
    except:
        print 'Could not connect to Elasticsearch'

   
    #Store authentication data in a local file
    token_file = os.getenv('HOME','')+"/.ssh/gotoken.txt"
    wrap = CatalogWrapper(token_file=token_file)
 
    the_args = sys.argv
    print the_args[1]


    # _,cur_catalogs = wrap.catalogClient.get_catalogs()
    # print cur_catalogs

    _,cur_datasets= wrap.catalogClient.get_datasets(the_args[1])
    #print cur_datasets

    for dataset in cur_datasets:
        dataset['tags'] = ["tomography","DeCarlo", "Francesco", "APS","catalog", "Globus", "import"]
        print dataset
        add_to_es(dataset)