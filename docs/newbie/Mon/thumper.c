/*
**  written by Hannah on 12/92
*/

inherit MonsterCode;


void extra_create(  )
{
   seteuid( "genious_member" );
   set_name( "thumper" );
   add_alias( "rabbit" );
   set_short( "a rabbit named \"Thumper\"" );
   set_long( "Thumper is a cute little rabbit with gray fur and black eyes." );
   set_natural_ac( 1 );
   set_alignment( GOOD_AL );
   set_race( "animal" );
   set_gender( "male" );
   set_type( "blunt" );
   set_stat( "str", 11 );
   set_stat( "int", 8 );
   set_stat( "wil", 9 );
   set_stat( "con", 10 );
   set_stat( "dex", 14 );
   set_stat( "chr", 20 );
   set_skill( "dodge", 6 );
  //help the noobs.  -isaac
  set_percent_bonus_exp(200);
   add_combat_message( "kick", "kicks" );
}
