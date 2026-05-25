// Death - 03/27/94
// Copper ring.  Based on the code from entesia's ring of strength but better
// in that it's only one object instead of two and cleaned up in other ways.
inherit ArmorCode;
inherit IdentifyCode;
inherit "/obj/armor/armor/special/base_ring";
object str;

void extra_create()
{
    set_name("copper ring");
    add_alias("ring");
    set_short("a copper ring");
    set_id_short("A ring of strength");
    set_id_long(
      "Wearing this ring make you much stronger, but you will become less agile\n"+
      "and dumber.\n"
    );
    set_long(
      "This is a ring of hammered copper.  It tingles when you hold it.\n"+
      "Inside the ring are inscribed some magical runes which you cannot\n"+
      "decipher.\n"
    );
    set( RingP, 1 );
    set( MagicP, 1 );
    set( MetalP, 1 );
    set_weight(30);
    set_ac(0);
    set( NoTemperP, 1 );
    set( NoEnchantP, 1 );
    set_value(4000);
}

wear_signal(object wearer)
{
    if (::wear_signal(wearer))
	return 1;
    if (wearer->query_stat("int") < 10 || wearer->query_stat("dex") < 10) {
	write("You are too weak-minded to wear this ring.\n");
	return 1;
    }
    wearer->add_bonus_object(THISO);
    write("You wear the ring and feel a little different.\n");
}

void remove_comm(object wearer)
{
    wearer->remove_bonus_object(THISO);
    write("You feel normal again after removing the ring.\n");
}


query_stat_bonus(arg)
{
    if (arg=="str") return 10;
    if(arg=="int") return -5;
    if(arg=="dex") return -5;
}
