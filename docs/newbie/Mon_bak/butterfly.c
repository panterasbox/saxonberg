/*
**  written by Hannah on 10/92
*/

inherit MonsterCode;
inherit MonsterTalk;


void extra_create()
{
   set_name( "butterfly" );
   set_short( "a butterfly" );
   set_long(
      "This is a beautiful, delicate butterfly.  The color of its wings "+
      "dazzle in the bright sunlight as it flies about." );
   set_race( "winged_insect" );
   set_natural_ac( 1 );
   set_alignment( HONORABLE_AL );
   set_type( "blunt" );
   set_stat( "str", 5 );
   set_stat( "int", 4 );
   set_stat( "wil", 7 );
   set_stat( "con", 6 );
   set_stat( "dex", 12 );
   set_stat( "chr", 10 );
   add_combat_message( "flutter furiously at", "flutters furiously at" );

   set_chat_chance( 30 );
   set_chat_rate( 30 + random( 10 ) );
   add_phrase( "A butterfly flutters past your head." );
   add_phrase( "A butterfly lands on your shoulder briefly, then flies "+
               "away." );
}
