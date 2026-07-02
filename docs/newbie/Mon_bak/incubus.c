/*
**  written by Hannah on 12/92
*/

inherit MonsterCode;
inherit MonsterTalk;
#include "../../GPaths.h"

#define  TALISMAN  NEWBIE + "Obj/talisman"


void extra_create()
{
    set_name( "incubus" );
    set_short( "an incubus" );
    set_long(
      "This is an evil spirit, who will try to infect your dreams if you " +
      "aren't careful.  His presence feels oppressive." );
    set_race( "imp" );
    set_gender( "male" );
    set_natural_ac( 2 );
    set_alignment( EVIL_AL );
    set_damage_bonus( 1 );
    set_hit_bonus( 1 );
    set_heal_rate( 30 );
    set_heal_amount( 2 );
    set_type( "blunt" );
    set_stat( "str", 14 );
    set_stat( "int", 25 );
    set_stat( "wil", 12 );
    set_stat( "con", 15 );
    set_stat( "dex", 15 );
    set_stat( "chr", 25 );

    set_chat_chance( 50 );
    set_chat_rate( 30 + random( 10 ) );
    add_phrase( "The incubus seems to search for a dreamer to harm." );
    add_phrase( "The incubus examines a talisman in his hand." );

    move_object( clone_object( TALISMAN ), THISO );
}
