inherit "/obj/armor/armor/special/base_ring";
inherit IdentifyCode;

object Owner;
string on;

extra_create() {
    set_name("regeneration ring");
    set_short("a gold ring");
    set_long("This is a gold ring with indecipherable magic runes.\n");
    set_id_short("A ring of Regeneration");
    set_id_long("This ring will cause you to regain hitpoints very quickly. \n"+
      "This is a Regeneration Ring.");
    add_alias("ring");
    add_alias("gold ring");
    set_value(8000);
}

heal() {

    if(on) call_out("heal",3);
    if(on) {
	if(Owner->query_mana()<10) {
	    return 1;
	}

	if (Owner->query_hp() == Owner->query_max_hp()) return 1;

	Owner->add_hp(random(4));
	Owner->add_fatigue(random(4));
	Owner->add_mana(-random(4) - 1);

    }
    return 1;
}

wear_comm() {

    Owner=THISP;
    write("You feel a sudden rush!\n");
    on=1;
    call_out("heal",3);
    return;
}

remove_signal() {
    write("You feel cold inside.\n");
    Owner->add_mana(-30);
    Owner->add_fatigue(-30);
    on=0;
    return 0;
}

void post_long() {
    if (!on) return;
    write("It is glowing with magical energies.\n");
    return;
}
