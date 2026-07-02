//  wall.c
//  Newbie Area Entrance
//  written by Hannah on 11/92
//  Edited by Diablo 9/99

inherit RoomPlusCode;
#include "../GPaths.h"

#define HERE  NEWBIE + "wall"
#define DEST  NEWBIE + "crossroads"


void extra_create()
{
    set( "short", "Border to Easy Land" );
    set( "day_long",
      "The small path leads up to a giant wall to the north, with " +
      "a very small gate.  You seem to have reached the protected " +
      "entrance to a new land.  A pair of extremely burly guards " +
      "stand at attention at the gate.                          " );
    set( "day_light", SUNLIGHT );
    set( "exits", ([
      "south": "entrance",
    ]) );
    set( "descs", ([
      "path":
          "The path goes north towards the gate.",
      ({ "wall", "walls" }):
          "The wall is too high to climb, and stretches as far as the " +
          "eye can see.",
      "entrance":
          "The entrance looks well-protected.",
      ({ "guards", "guard" }):
          "Each of the guards is a large, well-built man.",
    ]) );
    set( "reset_data", ([
      "sign"        : NEWBIE + "Obj/wsign",
      "newbie_wall" : NEWBIE + "Obj/nwall",
    ]) );
    set( OutsideP, 1 );
}

void extra_init()
{
    add_action( "go_north", "north" );
}

int go_north( string str )
{
    if( str )
        return( 0 );

    /* ========== PLAYER STATS CHECK ========== */
    if( ( GetLevel( THISP ) == "mortal" )
      && ( ( to_int( THISP->query_eval() ) > 30 )
        || ( THISP->query_stat( "str" ) > 50 )
        || ( THISP->query_stat( "con" ) > 50 ) ) )
    {
        say(PNAME + " tries to go through the gate, but the guards stop " +
          objective( THISP ) + ".\n" );
        write( "You try to go through the gate, but the guards stop you.\n" );
        tell_room( THISO,
          "One of the guards says, \"You are much too powerful.\"\n" );
        return( 1 );
    }
   {
    say( "The guards look " + PNAME + " over.\n" );
    write( "The guards look you over.\n" );
    tell_room( DEST, PNAME + " " + THISP->query_msgin() + ".\n" );
    move_object( THISP, DEST );
    tell_room( HERE, PNAME + " " + THISP->query_msgout() +
        " through the gates north.\n" );
    command( "glance", THISP );
    return( 1 );
   }
}
