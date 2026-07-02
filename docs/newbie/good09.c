//  Genious: newbie/good09.c
//  written by Hannah on 11/92

#include "Newbie.h"

#define STAIRS  NEWBIE + "good13"
#define SIGN \
  "The sign says:\n"+ \
   "                  If you happen to die, you can come to this\n"+ \
   "                     church and \"pray\" for a new body.\n"


void extra_create()
{
    set( "short", "Rainbow Village Church" );
    set( "ansi_short", ESC + "[31m" + "R" +
      ESC + "[33m" + "a" + ESC + "[32m" + "i" + ESC + "[36m" + "n" +
      ESC + "[34m" + "b" + ESC + "[35m" + "o" + ESC + "[31m" + "w" +
      ESC + "[2;37;0m" + ESC + "[0;0m" + " Village Church" );
    set( "day_long",
      "This is a large church that serves all religious denominations that "+
      "promote peace and goodwill and cherish life.  The stone walls give "+
      "way to giant windows which let in the bright sunlight.  Rows of "+
      "wooden pews face a tall wooden pulpit.  There is a small sign "+
      "near the church entrance, and a small yet brightly-lit doorway "+
      "near the back." );
    set( "day_light", WELL_LIT );
    set( "night_light", WELL_LIT );

    set( "exits", ([ "east":  "good10",
                     "south": "good08" ]) );

    set( "descs", ([
      "glass":
          "They're clear.",
      "church":
          "This is a typical church, with rows of wooden pews all facing "+
          "a tall wooden pulpit.",
      ({ "walls", "wall", "stone walls" }):
          "The stone walls appear to be quite solid.",
      ({ "windows", "window" }):
          "These are large windows made of clear glass.",
      ({ "pews", "pew" }):
          "There is plenty of seating room left.",
      "pulpit":
          "This is a standard wooden platform.",
      ({ "sign", "small sign" }):
          "@see_sign",
      "doorway":
          "A soft, mystical light shines from the doorway." ]) );

     set( "reset_data", ([ "holydude": NEWBIE + "Mon/priest" ]) );
}


void extra_init()
{
    add_action( "do_read",  "read" );
    add_action( "do_pray",  "pray" );
    add_action( "do_enter", "enter" );
}


int see_sign()
{
    write( SIGN );
    return 1;
}


status do_read( string str )
{
    notify_fail( "What do you want to read?\n" );
    if( !str || ( str != "sign" && str != "small sign" ) )
      return( 0 );
    return( printf( SIGN ), 1 );
}


status do_pray( string str )
{
    if( !THISP->query_ghost() )
      return( 0 );
    THISP->make_me_alive();
    return( 1 );
}


status do_enter( string str )
{
    if( !str || str != "doorway" )
         return( 0 );
    move_object( THISP, STAIRS );
    if( ENV( THISP ) == THISO )    // not good enough for the stairs
         return( 1 );
    tell_room( THISO, PNAME + " enters a small doorway.\n" );
    write( "You enter the small doorway...\n\n" );
    tell_room( STAIRS, sprintf( "%s %s.\n", PNAME, THISP->query_msgin() ),
         ({ THISP }) );
    command( "glance", THISP );
    return( 1 );
}
