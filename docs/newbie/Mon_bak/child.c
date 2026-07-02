/*
**  written by Hannah on 10/92
*/

inherit MonsterCode;
inherit MonsterTalk;


void extra_create()
{
   string Type;
   object Weapon;

   seteuid( "genious_member" );
   if( random( 2 ) == 1 ) {
      set_gender( "male" );
      Type = "son";
   }
   else {
      set_gender( "female" );
      Type = "daughter";
   }
   set_name( Type );
   set_short( "a " + Type );
   add_alias( "child" );
   set_long(
      "This is a typical child of Rainbow Village, and the "+
       Type + " of the family." );
   set_race( "human" );
   set_natural_ac( 1 );
   set_alignment( GOOD_AL );
   set_offensive_level( 2 );
   set_stat( "str", 9 );
   set_stat( "int", 10 );
   set_stat( "wil", 9 );
   set_stat( "con", 10 );
   set_stat( "dex", 20 );
   set_stat( "chr", 15 );
   set_skill( "dodge", 20 );
   add_money( 50 + random( 10 ) );

   set_chat_chance( 30 );
   set_chat_rate( 20 + random( 20 ) );
   add_phrase(
      "The " + Type + " works on a homework assignment." );
   add_phrase(
      "The " + Type + " asks: Dad, can I go out and play?" );
   add_combat_phrase(
      "The " + Type + " cries: Daddy!  Help me!" );
}
