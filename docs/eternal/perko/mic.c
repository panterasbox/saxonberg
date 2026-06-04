inherit ThingCode;
 
#include "path.h"
 
object whosup;
 
void extra_create()
{
  set( "id", ({
    "microphone",
    "mike",
    "mic",
    }) );
  set( "short", "a microphone, attached to a stand" );
  set( "long",
    "This is a microphone on a stand, currently raised "
    "to about five feet in height.  It is on." );
  set( "gettable", 0 );
  set( "droppable", 0 );
  set( ElectricalP, 1 );
}
 
void extra_init()
{
  add_action( "do_say",  "'", 2 );
  add_action( "do_say",  "say", 2 );
  add_action( "do_say",   "go"   );
  add_action( "do_sing", "sing" );
}
 
check_who()
{
  if( THISP == whosup )
    return;
  whosup = THISP;
  write( "You step up to the microphone.\n" );
  say( PNAME + " steps up to the microphone.\n" );
  return;
}
 
do_say( string str )
{
  check_who();
  write( strformat( "You say into the microphone: " + str ) );
  say( strformat( " into the microphone: "
    + str, PNAME + " says" ) );
  return 1;
}
 
do_sing( string str )
{
  check_who();
  write( strformat( "You sing into the microphone, \"" 
    + str + "\"" ) );
  say( strformat( PNAME + " sings into the microphone, \""
    + str + "\"" ) );
  return 1;
}
