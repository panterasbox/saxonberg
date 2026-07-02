/*
**  written by Hannah on 12/92
*/

inherit MonsterCode;
inherit MonsterTalk;


void extra_create()
{
   seteuid( "genious_member" );
   set_name( "bambi" );
   add_alias( "deer" );
   set_short( "a deer named \"Bambi\"" );
   set_long(
      "This is Bambi, a young, brave deer.  He has a brown hide with cute "+
      "little white spots and a white tail." );
   set_race( "animal" );
   set_gender( "male" );
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
   set_skill( "dodge", 10 );

   set_chat_chance( 30 );
   set_chat_rate( 20 + random( 20 ) );
   add_combat_message( "slice", "uses his hooves to slice" );
   add_phrase( "Bambi looks at you with large, brown eyes." );
   add_phrase( "Bambi grazes on the wild grass." );
   add_phrase( "Bambi looks around for his mother." );
}
