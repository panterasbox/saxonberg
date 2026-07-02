//  Genious: newbie/inn.c
//  Written by Hannah on 5/94

#include "Newbie.h"
#include <ansi.h>

#define SIGN \
  sp+"+=================================================================+\n"+ \
  sp+"|                          THE  INNDIGO                           |\n"+ \
  sp+"+-----------------------------------------------------------------+\n"+ \
  sp+"| "+tx+"junk <number>"+nr+"     -"+ \
     "  discard stored item <number>             |\n"+ \
  sp+"| "+tx+"list"+nr+"              -"+ \
     "  list your stored items                   |\n"+ \
  sp+"| "+tx+"retrieve <number>"+nr+" -"+ \
     "  retrieve stored item <number>            |\n"+ \
  sp+"| "+tx+"store <all|name>"+nr+"  -"+ \
     "  store all of your items, or item <name>  |\n"+ \
  sp+"| "+tx+"quit"+nr+"              -"+ \
     "  save your position and quit the game     |\n"+ \
  sp+"+=================================================================+\n"


void extra_create()
{
    set( "short", "The Inndigo" );
    set( "day_long",
      "You find yourself in a cozy little inn.  Mellow music can be heard " +
      "coming from hidden speakers.  This is a good place to store your " +
      "belongings when you get sleepy.  " +
      "On one wall is a small sign." );
    set( "day_light", PART_LIT );
    set( "night_light", PART_LIT );

    set( "exits", ([ "down": "inn_anteroom" ]) );

    set( "descs", ([
       "sign": "@print_sign" ]) );

    set( "reset_data", ([ "lockers": SaveRoomCode ]) );
}


void extra_init()
{
    add_action( "do_read", "read" );
}


void print_sign()
{
    string  sp, tx, nr;

    sp = "      ";
    tx = "'";
    nr = "'";
    if( THISP->query_ansi() )
    {
        tx = BBLK + YEL + " ";
        nr = " " + NOR;
    }
    write( SIGN );
}


status do_read( string str )
{
    notify_fail( "What do you want to read?\n" );
    if( !str || ( str != "sign" ) )
        return( 0 );
    print_sign();
    return( 1 );
}
