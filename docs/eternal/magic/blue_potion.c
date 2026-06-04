inherit "/zone/null/eternal/magic/potioncode";

extra_create()
{
    set_look("blue");
    set_value(200);
}

drink()
{

    if(THISP->query_mana() < 20)
	write("Energize me!\n");
    THISP->add_mana(THISP->query_max_mana());
    write("The world spins...\n");
}
