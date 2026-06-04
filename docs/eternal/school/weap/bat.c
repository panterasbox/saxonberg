inherit NewWeaponCode;

void extra_create()
{
    set_ids( ({ "slugger", "Lousiville Slugger", "louisville slugger", 
      "Louisville slugger", "baseball bat", "bat" }) );
    set_short( "a baseball bat" );
    set_long(
      "This is a beautiful hornsby-finished maple bat made in "
      "Louisville.  It has a 15 inch handle, medium barrel, and "
      "looks like it could knock a baseball (or a monster) back "
      "to the stone age.  It has an oval-shaped brand mark on it." );
    set_descs( ([ ({ "oval", "brand", "mark" }) : 
      "The mark reads: 'Louisville Slugger'" ]) );
    set_material( "wood" );
    set_weight( 250 );
    set_value( 25 );
    set_base_damage( 5 + random(10) );
    set_damage_step( 7 );
    set_base_speed( 9 );
    set_speed_step( 15 );
    set_prof_mod( 4.0 );
    set_fatigue_cost( 2 );
    add_combat_message( ({ "slug", "slugs" }) );
    set_proficiency( "light club" );
    set_damage_type( "blunt" );
    set_handed( 2 );
}
