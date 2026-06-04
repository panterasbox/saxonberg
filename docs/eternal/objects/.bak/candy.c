#include "/zone/null/eternal/eternal.h"
inherit ObjectCode;
 
void extra_create()
  {
  set( "id", ({
    "candy",
    "piece of candy",
    "piece",
    "wrapped candy",
    }) );
  set( "short", "a piece of wrapped candy" );
  set( "long",
    "This is a small piece of generic candy, encased in a "
    "cellophane wrapper.  It looks very anti-tasty." );
  set( "value", 0 );
  set( NoStoreP, 1 );
  }
 
void init()
  {
  add_action( "do_eat", "eat" );
  add_action( "do_eat", "consume" );
  add_action( "sell_thing", "sell" );
  }
 
int do_eat( string str )
  {
  if( !str )
    {
    write( CAP(query_verb()) + " what?\n" );
    return 1;
    }
  if( !id(str) )
    return 0;
  say( strformat( PNAME + " unwraps a small candy and "
    "pops it into " + possessive(THISP) + " mouth, a "
    "look of grim distaste crossing " + possessive(THISP)
    + " face." ) );
  write( strformat( "You pop the candy into your mouth "
    "and crunch it on down.  You realize that this is "
    "by far the nastiest candy you've ever tasted." ) );
  destruct(THISO);
  return 1;
  }

sell_thing(string str)
  {
  if( id(str) || str == "all" )
    command( "channel gossip hi everyone! I take posts FAR too seriously! "
      "Please hunt me down and kill me at your earliest convenience.",
      THISP );
  return 0;
  }
