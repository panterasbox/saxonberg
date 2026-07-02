//  Genious: slime.c
//  Written by Hannah on 10/92

inherit MonsterCode;
inherit MonsterTalk;


void extra_create()
{
    set_name( "slime" );
    set_short( "a slime" );
    set_long( "This is a wet, sticky glob of slime." );
    set_race( "slime" );
    set_natural_ac( 1 );
    set_alignment( MALICIOUS_AL );
    add_combat_message( "splat on", "splats on" );
    set_type( "blunt" );
    set_stat( "str", 5 );
    set_stat( "int", 3 );
    set_stat( "wil", 11 );
    set_stat( "con", 10 );
    set_stat( "dex", 12 );
    set_stat( "chr", 2 );
  //help the noobs.  -isaac
  set_percent_bonus_exp(200);

    set_chat_chance( 30 );
    set_chat_rate( 20 + random( 20 ) );
    add_phrase( "A glob of slime creeps towards you." );
}
