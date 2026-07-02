/*
**  written by Hannah on 10/92
*/

inherit MonsterCode;


void extra_create()
{
   set_name( "bunny" );
   set_short( "a bunny" );
   set_long( "This is a cute little bunny with white fur and pink eyes." );
   set_natural_ac( 1 );
   set_alignment( HONORABLE_AL );
   set_race( "animal" );
   set_gender( random( 2 ) ? "female" : "male" );
   set_type( "blunt" );
   set_stat( "str", 10 );
   set_stat( "int", 8 );
   set_stat( "wil", 9 );
   set_stat( "con", 8 );
   set_stat( "dex", 12 );
   set_stat( "chr", 11 );
   set_skill( "dodge", 4 );
  //help the noobs.  -isaac
  set_percent_bonus_exp(200);
   add_combat_message( "kick", "kicks" );
   set( "plural", "bunnies" );
}
