inherit MonsterCode;
inherit MonsterTalk;

void extra_create()
{
   set_name( "lion" );
   add_alias( ({"lion", "monster"}) );
   set_short( "a lion" );
   set_long(
      "This is a male lion.  He has a long, dark mane, and he is clearly "
      "not one to be trifled with. ");
   set_race( "animal" );
   set_gender( "male" );
   set_alignment( 500 );
   set_type( "edged" );
   set_stat( "str", 30 );
   set_stat( "int", 24 );
   set_stat( "wil", 25 );
   set_stat( "con", 27 );
   set_stat( "dex", 24 );
   set_stat( "chr", 25 );
   add_combat_message( "scratch", "scratches" );
   add_money(random(80));

   set_chat_chance( 85 );
   set_chat_rate( 20 );
   add_phrase( "#roar" );
}
