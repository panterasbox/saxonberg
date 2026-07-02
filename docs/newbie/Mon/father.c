/*
**  written by Hannah on 11/92
*/

inherit MonsterCode;
inherit MonsterTalk;

void extra_create()
{
    seteuid( getuid() );
    set_name( "father" );
    add_alias( "man" );
    set_short( "a father" );
    set_long(
       "This is the owner of this fine home.  He wears a simple garb that "+
       "looks quite comfortable." );
    set_gender( "male" );
    set_race( "human" );
    set_natural_ac( 1 );
  //help the noobs.  -isaac
  set_percent_bonus_exp(200);
    set_alignment( GOOD_AL );
    set_offensive_level( 5 );
    set_stat( "str", 14 );
    set_stat( "int", 19 );
    set_stat( "wil", 10 );
    set_stat( "con", 13 );
    set_stat( "dex", 17 );
    set_stat( "chr", 20 );
    set_skill( "dodge", 10 );
    add_money( 20 + random( 10 ) );

    set_chat_chance( 30 );
    set_chat_rate( 20 + random( 20 ) );
    add_phrase( "The father beams with pride and joy." );
    add_phrase( "The father says: Life is wonderful." );
    add_combat_phrase(
       "The father cries: I must protect my family!  You fiend!" );
}
