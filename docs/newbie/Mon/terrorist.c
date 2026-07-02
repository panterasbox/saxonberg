//  terrorist.c
//  Written by Hannah on 12/92

inherit MonsterCode;
inherit MonsterTalk;

#include "../../GPaths.h"
#define  MY_WEAPON  WEAPONDIR + "blunt/fat_club"


void extra_create()
{
    string Subject, Pos;
    object Weapon;

    set_name( "terrorist" );
    set_short( "a terrorist" );
    if( random( 2 ) == 1 ) {
        set_gender( "male" );
        Subject = "He";
        Pos = "his";
    }
    else {
        set_gender( "female" );
        Subject = "She";
        Pos = "her";
    }
    set_long(
      "This appears to be a deranged terrorist, fighting for some unknown " +
      "cause.  " + Subject + " appears to be extremely nervous." );
    set_race( "human" );
    set_natural_ac( 2 );
    set_alignment( EVIL_AL );
    set_offensive_level( 10 );
    set_stat( "str", 22 );
    set_stat( "int", 19 );
    set_stat( "wil", 10 );
    set_stat( "con", 13 );
    set_stat( "dex", 17 );
    set_stat( "chr", 10 );
  //help the noobs.  -isaac
  set_percent_bonus_exp(200);
    add_money( 50 + random( 10 ) );

    set_chat_chance( 30 );
    set_chat_rate( 30 + random( 10 ) );
    add_phrase( "The terrorist cleans out " + Pos + " pistol." );
    add_phrase( "The terrorist shouts, \"I will kill all of my hostages, " +
      "one by one, until my demands are met!!\"" );
    add_combat_phrase( "The terrorist screams, \"I will die for my cause, " +
      "and take you with me!!\"" );

    move_object( clone_object( NEWBIE + "Obj/tbomb" ), THISO );

    Weapon = clone_object( MY_WEAPON );
    move_object( Weapon, THISO );
    wield_weapon( Weapon );
}
