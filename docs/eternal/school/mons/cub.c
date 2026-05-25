inherit MonsterMobCode;

void extra_create()
{
   set_name( "lion cub" );
   set_defend_type( "lions" );
   add_alias( ({"lion cub", "cub", "monster"}) );
   set_short( "a lion cub" );
   set_long(
      "This is a baby lion.  He is cute and playful, but even when he's "
      "just playing, you can't help but notice his sharp claws and teeth. ");
   set_race( "animal" );
   set_gender( "male" );
   set_alignment( 500 );
   set_type( "edged" );
   set_stat( "str", 24 );
   set_stat( "int", 18 );
   set_stat( "wil", 25 );
   set_stat( "con", 24 );
   set_stat( "dex", 24 );
   set_stat( "chr", 25 );
   add_combat_message( "scratch", "scratches" );
   add_combat_message( "bite", "bites" );

}

int query_my_defend( string s ) { return 0; }
