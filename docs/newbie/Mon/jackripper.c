//  jackripper.c
//  Written by Hannah on 12/92

inherit MonsterCode;
inherit MonsterTalk;

#include "../../GPaths.h"
#define  MY_WEAPON  NEWBIE + "Wea/scimitar"


void extra_create()
{
    object Weapon;

    seteuid( getuid() );
    set_name( "jack" );
    add_alias( "Jack" );
    add_alias( "ripper" );
    add_alias( "Ripper" );
    set_short( "Jack the Ripper" );
    set_long(
      "This is the infamous Jack the Ripper, looking for another " +
      "victim.  He peers about the room with a hateful look, and " +
      "has a few bloodstains on his shirt." );
  //help the noobs.  -isaac
  set_percent_bonus_exp(200);
    set_race( "human" );
    set_gender( "male" );
    set_natural_ac( 2 );
    set_alignment( "evil" );
    set_damage_bonus( 1 );
    set_hit_bonus( 1 );
    set_type( "blunt" );
    set_stat( "str", 24 );
    set_stat( "int", 27 );
    set_stat( "wil", 12 );
    set_stat( "con", 15 );
    set_stat( "dex", 14 );
    set_stat( "chr", 20 );
    add_money( 50 + random( 10 ) );

    set_chat_chance( 30 );
    set_chat_rate( 30 + random( 10 ) );
    add_phrase( "Jack grins, and it sends a shiver through your body." );
    add_phrase( "Jack feels around in his pockets for something." );

    Weapon = clone_object( MY_WEAPON );
    move_object( Weapon, THISO );
    wield_weapon( Weapon );
}
