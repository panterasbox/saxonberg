inherit MonsterCode;
inherit MonsterTalk;


void extra_create()
{
   set_name( "cow" );
   add_alias( ({"monster", "cow"}) );
   set_short( "An old milk cow" );
   set_long(
      "This old milk cow used to be a good provider of milk, but her udders "
      "have pretty much dried out now. ");
   set_race( "creature" );
   set_gender( "female" );
   set_alignment( 500 );
   set_type( "edged" );
   set_stat( "str", 14 );
   set_stat( "int", 7 );
   set_stat( "wil", 9 );
   set_stat( "con", 14 );
   set_stat( "dex", 7 );
   set_stat( "chr", 9 );
   add_combat_message( "bite", "bites" );
   add_money(random(40));

   set_chat_chance( 85 );
   set_chat_rate( 16 );
   add_phrase( "#moo" );
   add_phrase( "#fart" );
}


