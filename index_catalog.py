import sys
import json
import re
import os
import ConfigParser
import io

from catalog_wrapper import *
from globusonline.catalog.client.operators import Op, build_selector


if __name__ == "__main__":

   
    #Store authentication data in a local file
    token_file = os.getenv('HOME','')+"/.ssh/gotoken.txt"
    wrap = CatalogWrapper(token_file=token_file)
 
    the_args = sys.argv
    print the_args[1]

    #_,cur_datasets= wrap.catalogClient.get_datasets(catalog_arg)