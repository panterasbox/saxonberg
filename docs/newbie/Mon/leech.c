//  Genious: leech.c
//  Written by Hannah on 11/92

inherit MonsterCode;

void extra_create()
{
    set_name( "leech" );
    set_short( "a leech" );
    set_long( "This is a large, blood-sucking leech." );
    set_natural_ac( 1 );
    set_alignment( MALICIOUS_AL );
    set_race( "animal" );
    add_combat_message( "suck","sucks" );
    set_type( "blunt" );
    set_stat( "str", 15 );
    set_stat( "int", 8 );
    set_stat( "wil", 11 );
    set_stat( "con", 12 );
    set_stat( "dex", 8 );
    set_stat( "chr", 5 );
  //help the noobs.  -isaac
  set_percent_bonus_exp(200);
}
