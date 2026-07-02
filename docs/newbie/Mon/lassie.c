/*
**  written by Hannah on 11/92
*/

inherit MonsterCode;
inherit MonsterTalk;


void extra_create()
{
   seteuid( "genious_member" );
   set_name( "lassie" );
   add_alias( "dog" );
   add_alias( "collie" );
   set_short( "a collie named \"Lassie\"" );
   set_long(
      "This is Lassie, the dog hero.  She is such a friendly collie." );
   set_race( "animal" );
   set_gender( "female" );
   set_natural_ac( 2 );
   set_alignment( GOOD_AL );
   set_damage_bonus( 1 );
   set_hit_bonus( 1 );
   set_type( "edged" );
   set_stat( "str", 14 );
   set_stat( "int", 7 );
   set_stat( "wil", 12 );
   set_stat( "con", 15 );
   set_stat( "dex", 20 );
   set_stat( "chr", 20 );
  //help the noobs.  -isaac
  set_percent_bonus_exp(200);
   set_skill( "dodge", 10 );

   set_chat_chance( 30 );
   set_chat_rate( 20 + random( 20 ) );
   add_combat_message( "bury your teeth into", "buries her sharp teeth into" );
   add_phrase( "Lassie chases her tail." );
   add_phrase( "Lassie waves a paw at you." );
   add_combat_phrase( "Lassie growls!" );
   add_combat_phrase( "Lassie bares her teeth!" );
}
