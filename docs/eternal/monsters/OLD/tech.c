inherit "/zone/present/xmen/monsters/technician";

#include "path.h"

extra_create() {
  ::extra_create();
  set_short("Eternal Robot Technician");
  set_long("This is your handy dandy Eternal robomatic technician.\n"); }

welcome()
{
  if( query_once_interactive( THISP ) )
    say("Eternal Robot Technician says, \"Hi " + PNAME + ", welcome to Gold " +
     "Cross." + endl + "                            \"For more " +
     "information, type: help Gold Cross." + endl );
}
