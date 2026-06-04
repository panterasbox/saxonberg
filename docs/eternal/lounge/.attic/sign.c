#include "/zone/null/eternal/eternal.h"
inherit ObjectCode;

void extra_create()
{
  set( "id", "sign" );
  set("short", "a sign: README");
  set("gettable", 0);
  set("long", read_file( "/zone/null/eternal/lounge/policy" ) );
  set("read", read_file( "/zone/null/eternal/lounge/policy" ) );
}
