inherit "/zone/null/eternal/magic/potioncode";

extra_create()
{
    set_look("orange");
    set_value(200);
}

drink()
{

    if(THISP->query_hp() < 20)
	write("Wham!\n");
    THISP->add_hp(THISP->query_max_hp());
    write("You feel sound and hale!\n");
}
