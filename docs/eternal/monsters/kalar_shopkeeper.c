/* Kalar the Shopkeeper */

#include "/zone/null/eternal/eternal.h"
inherit MonsterCode;

#include "path.h"
#include "monster.h"

void extra_create()
{
    set_name("kalar");
    add_alias("Kalar");
    add_alias("shopkeeper");
	set_short("Kalar, the self-proclaimed anarchist");
    set_long(
      "Here stands Kalar, a mild mannered imp which endorses anarchy on all planes,\n" +
      "dimensions, and worlds of the multiverse.  He grins at you in mock respect,\n" +
      "baring his mouthful of tiny, needle-sharp teeth in the process.  Noticing\n" +
      "that you don't appear the least bit impressed, he stops smiling, and shrugs,\n" +
      "muttering, 'It never works anymore... *sigh*'\n");
    set_race("imp");
    set_alignment(30);
    set_type("blunt");
    set_toughness( 100 );
    set_max_hp(2000);
    set_max_fatigue(20000);
    add_prop( NoCharmP );
}
