//  Genious: newbie/crossroads.c
//  written by Hannah on 11/92

#include "Newbie.h"


#define SIGN \
  "                      ..................................\n" + \
  "                      :  <-W----- Rainbow Village        :\n" + \
  "                      ..................................\n" + \
  "                      :      Bewitched Forest -----E->  :\n" + \
  "                      ..................................\n" + \
  "\n" + \
  "Note: The newbie area is divided into good monsters and evil " + \
  "monsters, so this is a good place to work on your alignment.  " + \
  "There are freebies to be had, but most of them depend on how " + \
  "high or low your alignment is, and how well you look around.  " + \
  "Have fun!\n" +\
  "\n" + \
  "Player killing is now banned in the areas to the east and west.  " + \
  "Please consider this to be a safe haven from aggressive players.\n"


void extra_create()
{
    set( "short", "Crossroads Of Good And Evil" );
    set( "day_long",
      "The small path from the south wall splits up into two directions; " +
      "the west path looks green and inviting, while the east path appears "+
      "dark and foreboding.  You feel that this spot marks the boundary " +
      "between the land of Good and the domain of Evil."+
      "\n"+
      "    You notice a sign in front of you." );
    set( "day_light", PART_LIT );
    set( "night_light", PART_LIT );

    set( "exits", ([ "east":  "evil01",
                     "west":  "good01",
                     "south": "wall" ]) );

    set( "descs", ([
      "path":
        "This path goes in three different directions.",
      "east path":
        "It seems to lead to an evil place.",
      "west path":
        "It seems to lead to a happier place.",
      "sign" : SIGN ]) );
}


void extra_init()
{
    add_action( "read_sign", "read" );
}


status read_sign( string str )
{
    notify_fail( "Read what?\n" );
    if( !str || str != "sign" )
        return( 0 );
    return( write( strformat( SIGN ) ), 1 );
}


void print_sign()
{
    write( strformat( SIGN ) );
}
