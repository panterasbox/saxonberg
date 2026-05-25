/*
**  Receptionist (Bed & Breakfast Inn)
*/
 
#include "/zone/null/eternal/eternal.h"
inherit MonsterCode;

#include "path.h"
#include "monster.h"
 
void extra_create()
{
    set_name("viola");
    add_prop( NoCombatP );
    add_alias("receptionist");
    set_short("Viola, the receptionist, is sitting here behind the large desk");
    set_long(
      "Imagine the most toad-ugly dwarf you've ever seen and multiply that by " +
      "ten.  What you get is Viola.  Unfortunately, her looks betray her true " +
      "personality, as she really is a nice person once you get to know her.  " +
      "Anyway, as she notices you gagging, she politely looks the other way, " +
      "waiting for you to request some service of her."
    );
    set_race("dwarf");
    set_alignment("good");
    set_hit_bonus(3);
    set_damage_bonus(3);
    set_toughness( 100 );
    set_max_hp(1500);
    set_max_fatigue(5000);
    set_gender("female");
    add_combat_message("cast your ugly gaze at", "casts her ugly gaze at");
    add_prop( NoCharmP );
}
